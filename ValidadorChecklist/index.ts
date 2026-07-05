import {IInputs, IOutputs} from "./generated/ManifestTypes";

export class ValidadorChecklist implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _contenedor: HTMLDivElement;
    private _boton: HTMLButtonElement;
    private _etiquetaBoton: HTMLSpanElement;
    private _etiquetaVersion: HTMLSpanElement;
    
    private _contexto: ComponentFramework.Context<IInputs>;
    private _notificarCambioSalida: () => void;
    
    private _valorEstado: number | null;
    private _modoValidacion: string;
    
    private _listaCamposPCI: string[] = [];
    private _listaCamposSE: string[] = [];
    private _camposVinculados: Set<string> = new Set<string>();

    private _onCambioContextoFormularioLigado: () => void;

    constructor() {
        this._onCambioContextoFormularioLigado = this.onCambioContextoFormulario.bind(this);
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement): void {
        this._contexto = context;
        this._notificarCambioSalida = notifyOutputChanged;
        this._contenedor = container;

        this._boton = document.createElement("button");
        this._boton.style.padding = "8px 16px";
        this._boton.style.border = "none";
        this._boton.style.borderRadius = "4px";
        this._boton.style.cursor = "pointer";
        this._boton.style.width = "100%";
        this._boton.style.fontFamily = "Segoe UI, sans-serif";
        this._boton.style.transition = "background-color 0.3s, color 0.3s";
        this._boton.style.position = "relative"; 
        this._boton.style.display = "flex";
        this._boton.style.justifyContent = "center";
        this._boton.style.alignItems = "center";
        this._boton.style.minHeight = "40px";

        this._etiquetaBoton = document.createElement("span");
        this._etiquetaBoton.style.fontWeight = "bold";
        this._boton.appendChild(this._etiquetaBoton);

        this._etiquetaVersion = document.createElement("span");
        this._etiquetaVersion.innerText = "v1.0.13";
        this._etiquetaVersion.style.position = "absolute";
        this._etiquetaVersion.style.bottom = "2px";
        this._etiquetaVersion.style.right = "4px";
        this._etiquetaVersion.style.fontSize = "9px";
        this._etiquetaVersion.style.opacity = "0.7";
        this._etiquetaVersion.style.pointerEvents = "none";
        this._etiquetaVersion.style.zIndex = "10";
        this._boton.appendChild(this._etiquetaVersion);

        this._boton.addEventListener("click", this.onClickBoton.bind(this));
        this._contenedor.appendChild(this._boton);
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private obtenerListaCamposSE(): string[] {
        let valor = (this._contexto.parameters.campoMultilineaSE && this._contexto.parameters.campoMultilineaSE.raw) 
            ? this._contexto.parameters.campoMultilineaSE.raw as string 
            : "";
        
        valor = valor.replace(/<[^>]*>?/gm, '').replace(/(\r\n|\n|\r)/gm, "");
        return valor.split(",").map((f: string) => f.trim()).filter((f: string) => f.length > 0);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._contexto = context;
        this._valorEstado = context.parameters.estadoChecklist.raw;
        this._modoValidacion = context.parameters.modoValidacion.raw || "PCI";

        const req1 = context.parameters.camposRequeridos1.raw || "";
        const req2 = context.parameters.camposRequeridos2?.raw || "";
        const req3 = context.parameters.camposRequeridos3?.raw || "";
        const camposCombinados = [req1, req2, req3].filter(val => val.trim() !== "").join(",");
        this._listaCamposPCI = camposCombinados.split(",").map(f => f.trim()).filter(f => f.length > 0);

        this._listaCamposSE = this.obtenerListaCamposSE();

        this.vincularEventosCambio();
        this.evaluarEstadoBoton();
    }

    public getOutputs(): IOutputs {
        return {
            estadoChecklist: this._valorEstado !== null ? this._valorEstado : undefined
        };
    }

    public destroy(): void {
        this._boton.removeEventListener("click", this.onClickBoton.bind(this));
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private obtenerXrm(): any {
        const w = window as any;
        return w.Xrm || (w.parent && w.parent.Xrm) || null;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    private vincularEventosCambio(): void {
        const xrm = this.obtenerXrm();
        if (xrm && xrm.Page && xrm.Page.getAttribute) {
            
            // 1. Siempre vinculamos la lista PCI (ya que ahora SE también la requiere)
            for (const nombreCampo of this._listaCamposPCI) {
                const atributo = xrm.Page.getAttribute(nombreCampo);
                if (atributo && !this._camposVinculados.has(nombreCampo)) {
                    atributo.addOnChange(this._onCambioContextoFormularioLigado);
                    this._camposVinculados.add(nombreCampo);
                }
            }

            // 2. Adicionalmente, si es modo SE, vinculamos la lista multilínea
            if (this._modoValidacion === "SE") {
                for (const nombreCampo of this._listaCamposSE) {
                    const atributo = xrm.Page.getAttribute(nombreCampo);
                    if (atributo && !this._camposVinculados.has(nombreCampo)) {
                        atributo.addOnChange(this._onCambioContextoFormularioLigado);
                        this._camposVinculados.add(nombreCampo);
                    }
                }
            }
        }
    }

    private onCambioContextoFormulario(): void {
        this.evaluarEstadoBoton();
    }

    private evaluarEstadoBoton(): void {
        const xrm = this.obtenerXrm();

        if (this._valorEstado === 909540001) {
            this._boton.disabled = true;
            this._etiquetaBoton.innerText = "Realizado";
            this._boton.style.backgroundColor = "#107C10";
            this._boton.style.color = "white";
            this._boton.style.cursor = "default";
            this._etiquetaVersion.style.color = "white";
            return;
        }

        let esValidoParaFinalizar = true;

        if (xrm && xrm.Page && xrm.Page.getAttribute) {
            
            // --- VALIDACIÓN DE CAMPOS PCI (Aplica tanto a modo PCI como a modo SE) ---
            for (const nombreCampo of this._listaCamposPCI) {
                const atributo = xrm.Page.getAttribute(nombreCampo);
                if (atributo) {
                    const val = atributo.getValue();
                    if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
                        esValidoParaFinalizar = false;
                        break;
                    }
                } else {
                    esValidoParaFinalizar = false;
                    break;
                }
            }

            // --- VALIDACIÓN ESPECÍFICA PARA MODO SE ---
            // Solo entra si no ha fallado la validación de PCI previa
            if (this._modoValidacion === "SE" && esValidoParaFinalizar) {
                let tieneAlMenosUn909540002 = false;

                for (const nombreCampo of this._listaCamposSE) {
                    const atributo = xrm.Page.getAttribute(nombreCampo);
                    if (atributo) {
                        const val = atributo.getValue();

                        if (val === 909540001) {
                            // Cualquier valor en 909540001 bloquea
                            esValidoParaFinalizar = false;
                            break;
                        } else if (val === 909540002) {
                            // Encontramos al menos uno en estado correcto
                            tieneAlMenosUn909540002 = true;
                        } else if (val !== 909540000) {
                            // Si no es ni 0001, ni 0002, y tampoco es 0000, bloquea (ej. nulos)
                            esValidoParaFinalizar = false;
                            break;
                        }
                    } else {
                        esValidoParaFinalizar = false;
                        break;
                    }
                }

                // Si recorrió todo pero no hay ningún 909540002, no permite validar
                if (!tieneAlMenosUn909540002) {
                    esValidoParaFinalizar = false;
                }
            }

        } else {
            esValidoParaFinalizar = false; 
        }

        const estadoEsValido = (this._valorEstado === 909540000 || this._valorEstado === null);

        if (estadoEsValido && esValidoParaFinalizar) {
            this._boton.disabled = false;
            this._etiquetaBoton.innerText = "Validar y finalizar";
            this._boton.style.backgroundColor = "#0078D4";
            this._boton.style.color = "white";
            this._boton.style.cursor = "pointer";
            this._etiquetaVersion.style.color = "white";
        } else {
            this._boton.disabled = true;
            this._etiquetaBoton.innerText = "Pendiente de realizar";
            this._boton.style.backgroundColor = "#FFE8CC";
            this._boton.style.color = "#D83B01";
            this._boton.style.cursor = "not-allowed";
            this._etiquetaVersion.style.color = "#D83B01";
        }
    }

    private onClickBoton(): void {
        if (this._boton.disabled) return;
        this._valorEstado = 909540001;
        this._notificarCambioSalida();
        this.evaluarEstadoBoton();
        setTimeout(() => {
            const xrm = this.obtenerXrm();
            if (xrm && xrm.Page && xrm.Page.data && xrm.Page.data.entity) {
                xrm.Page.data.entity.save();
            }
        }, 300);
    }
}