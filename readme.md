# Validador de Checklist (PCF)

Un control personalizado (Power Apps Component Framework) diseñado para aplicaciones basadas en modelos (Model-Driven Apps). Transforma un campo de tipo Conjunto de Opciones (*OptionSet*) en un botón interactivo que evalúa en tiempo real si una serie de campos obligatorios han sido completados antes de permitir finalizar una tarea o checklist.

---

## 🚀 Características Principales

- **Validación en Tiempo Real:** Se suscribe automáticamente a los eventos `addOnChange` de los campos requeridos, actualizando el estado del botón al instante sin necesidad de recargar la página.
- **Bypass del Límite de 100 Caracteres:** Supera la limitación nativa del diseñador de formularios de Power Apps dividiendo la entrada de campos requeridos en tres variables distintas que se concatenan dinámicamente en código.
- **Guardado Automático:** Al hacer clic en "Validar y finalizar", el control actualiza el valor del OptionSet y ejecuta un guardado automático del formulario (`Xrm.Page.data.entity.save()`).
- **Contexto Robusto:** Implementa una búsqueda profunda del objeto `Xrm` (`window.parent.Xrm`) para garantizar su funcionamiento óptimo incluso cuando el PCF se renderiza dentro de un *iframe*.
- **Versionado Visual:** Muestra la versión actual del componente en la esquina inferior derecha del botón, facilitando la depuración y asegurando que los usuarios no estén viendo una versión en caché.

---

## 🎨 Estados de la Interfaz (UI)

El botón cambia visualmente y bloquea/desbloquea su interacción dependiendo del estado del registro y de los campos requeridos:

1. **🟡 Pendiente de realizar:** - **Condición:** Faltan campos por completar o el estado es nulo/inicial.
   - **Visual:** Fondo ámbar suave con texto teja. Botón deshabilitado.
2. **🔵 Validar y finalizar:**
   - **Condición:** Todos los campos requeridos tienen valor y el estado del checklist es el inicial (`909540000`).
   - **Visual:** Azul estándar de Microsoft. Botón habilitado y clicable.
3. **🟢 Realizado:**
   - **Condición:** El valor del campo vinculado es `909540001`.
   - **Visual:** Fondo verde corporativo. Botón deshabilitado (estado final).

---

## ⚙️ Configuración en Power Apps

Una vez añadido el control al formulario (vinculado típicamente al campo `sec_estadochecklist`), debes configurar las siguientes propiedades estáticas en el panel lateral:

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| **Estado Checklist** | `OptionSet` | Propiedad enlazada (`bound`). Es el campo sobre el que actúa el botón. |
| **Campos Requeridos (Parte 1)** | `Input` | Nombres lógicos de los campos a validar separados por comas. (Máx. 100 caracteres por limitación de Dataverse). |
| **Campos Requeridos (Parte 2)** | `Input` | *Opcional*. Continuación de la lista si se supera el límite de la Parte 1. |
| **Campos Requeridos (Parte 3)** | `Input` | *Opcional*. Continuación de la lista si se supera el límite de la Parte 2. |

### Ejemplo de configuración (Separación de grupos)

Si tienes muchos campos, divídelos lógicamente sin preocuparte de poner una coma al final de cada bloque; el control los fusionará automáticamente:

- **Parte 1:** `sec_panelmarca,sec_panelmodelo,sec_idpanel,sec_tecladomodelo,sec_estado_central`
- **Parte 2:** `sec_verificacion_baterias,sec_simulacion_fuego,sec_indicadores_sonoros`
- **Parte 3:** `sec_accionadores_manuales,sec_muestreo_detectores,sec_limpieza_calibracion`

---

## 🛠️ Despliegue y Compilación

Para compilar y subir este componente directamente a tu entorno de Dataverse (asegúrate de estar autenticado con el CLI de Power Platform):

```bash
# Navegar a la carpeta del proyecto
cd ValidadorChecklistPCF

# Ejecutar el push al entorno con tu prefijo de editor
pac pcf push --publisher-prefix sec
