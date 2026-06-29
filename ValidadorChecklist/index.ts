import {IInputs, IOutputs} from "./generated/ManifestTypes";

export class ValidadorChecklist implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _contenedor: HTMLDivElement;
    private _boton: HTMLButtonElement;
    private _etiquetaBoton: HTMLSpanElement;
    private _etiquetaVersion: HTMLSpanElement;
    
    private _contexto: ComponentFramework.Context<IInputs>;
    private _notificarCambioSalida: () => void;
    
    private _valorEstado: number | null;
    private _listaCamposRequeridos: string[] = [];
    private _camposVinculados: Set<string> = new Set<string>();

    private _onCambioContextoFormularioLigado: () => void;

    constructor() {
        this._onCambioContextoFormularioLigado = this.onCambioContextoFormulario.bind(this);
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement): void {
        this._contexto = context;
        this._notificarCambioSalida = notifyOutputChanged;
        this._contenedor = container;

        // Crear el botón
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
        this._boton.style.minHeight = "40px"; // Asegura altura para que quepa la versión sin solaparse demasiado

        // Crear el span para el texto del botón
        this._etiquetaBoton = document.createElement("span");
        this._etiquetaBoton.style.fontWeight = "bold";
        this._boton.appendChild(this._etiquetaBoton);

        // Crear el span para el versionado
        this._etiquetaVersion = document.createElement("span");
        this._etiquetaVersion.innerText = "v1.0.6";
        this._etiquetaVersion.style.position = "absolute";
        this._etiquetaVersion.style.bottom = "2px";
        this._etiquetaVersion.style.right = "4px";
        this._etiquetaVersion.style.fontSize = "9px";
        this._etiquetaVersion.style.opacity = "0.7";
        this._etiquetaVersion.style.pointerEvents = "none";
        this._etiquetaVersion.style.zIndex = "10"; // Evita que otros elementos lo tapen
        this._boton.appendChild(this._etiquetaVersion);

        this._boton.addEventListener("click", this.onClickBoton.bind(this));
        this._contenedor.appendChild(this._boton);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._contexto = context;
        this._valorEstado = context.parameters.estadoChecklist.raw;

        const req1 = context.parameters.camposRequeridos1.raw || "";
        const req2 = context.parameters.camposRequeridos2?.raw || "";
        const req3 = context.parameters.camposRequeridos3?.raw || "";
        
        const camposCombinados = [req1, req2, req3].filter(val => val.trim() !== "").join(",");
        this._listaCamposRequeridos = camposCombinados.split(",").map(f => f.trim()).filter(f => f.length > 0);

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
            for (const nombreCampo of this._listaCamposRequeridos) {
                const atributo = xrm.Page.getAttribute(nombreCampo);
                if (atributo && !this._camposVinculados.has(nombreCampo)) {
                    atributo.addOnChange(this._onCambioContextoFormularioLigado);
                    this._camposVinculados.add(nombreCampo);
                }
            }
        }
    }

    private onCambioContextoFormulario(): void {
        this.evaluarEstadoBoton();
    }

    private evaluarEstadoBoton(): void {
        const xrm = this.obtenerXrm();

        // 1. Prioridad máxima: Realizado
        if (this._valorEstado === 909540001) {
            this._boton.disabled = true;
            this._etiquetaBoton.innerText = "Realizado";
            this._boton.style.backgroundColor = "#107C10";
            this._boton.style.color = "white";
            this._boton.style.cursor = "default";
            this._etiquetaVersion.style.color = "white";
            return;
        }

        // 2. Evaluamos si todos los campos tienen valor
        let todosTienenValor = true;
        if (xrm && xrm.Page && xrm.Page.getAttribute) {
            for (const nombreCampo of this._listaCamposRequeridos) {
                const atributo = xrm.Page.getAttribute(nombreCampo);
                if (atributo) {
                    const val = atributo.getValue();
                    if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
                        todosTienenValor = false;
                        break;
                    }
                } else {
                    todosTienenValor = false;
                    break;
                }
            }
        } else {
            todosTienenValor = false; 
        }

        const estadoEsValido = (this._valorEstado === 909540000 || this._valorEstado === null);

        // 3. Estado: Todos los campos llenos
        if (estadoEsValido && todosTienenValor) {
            this._boton.disabled = false;
            this._etiquetaBoton.innerText = "Validar y finalizar";
            this._boton.style.backgroundColor = "#0078D4";
            this._boton.style.color = "white";
            this._boton.style.cursor = "pointer";
            this._etiquetaVersion.style.color = "white";
        } 
        // 4. Estado: Faltan campos
        else {
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