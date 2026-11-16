# VISUALIZADOR DE EEG

Herramienta analítica interactiva basada en navegador web para la carga masiva (hasta 50 archivos CSV), configuración de **hasta 5 estímulos experimentales**, división/segmentación automática de los CSVs por ventana temporal, visualización gráfica porcentual interactiva (Plotly), explicaciones estadísticas por gráfico, **módulo de estadística inferencial (Test de Shapiro-Wilk y ANOVA de Medidas Repetidas con contrastes Post-Hoc)** y **dictamen ejecutivo final** que recomienda qué estímulo se debería utilizar según el objetivo de la investigación.

---

## 🧠 Dimensiones Clave de Neuromarketing

* **Nivel de Atención = PERCEPCIÓN (0 a 100%):** Mide el enfoque consciente, la agudeza sensorial, la captación del mensaje publicitario y la alerta cognitiva.
* **Nivel de Meditación = RECUERDOS, ANCLAS Y EMOCIÓN (0 a 100%):** Mide la resonancia afectiva positiva, la creación de anclas de marca en la memoria y la receptividad sin fatiga mental.

---

## 🎯 Marco de la Investigación y Protocolo Secuencial

### 1. Configuración del Estudio
* **Tema de Investigación:** Ej. *Evaluación de spots publicitarios para lanzamiento de una nueva bebida energizante*.
* **Objetivo de Investigación:** Ej. *Determinar qué comercial maximiza la percepción de marca y la conexión emocional en los consumidores*.
* **Criterio de Elección:**
  * *Balance Integral (Alta Percepción + Alto Anclaje Emocional)* [Recomendado]
  * *Maximizar Percepción (Atención)*
  * *Maximizar Conexión Emocional y Recuerdos (Meditación)*

### 2. Protocolo Secuencial Intercalado: Estímulos y Neutrales
El protocolo sigue una secuencia experimental formal de laboratorio:
$$\text{Estímulo 1} \longrightarrow \text{Neutral 1} \longrightarrow \text{Estímulo 2} \longrightarrow \text{Neutral 2} \longrightarrow \dots \longrightarrow \text{Estímulo 5}$$

* **Estímulos de Prueba (hasta 5):** Cada estímulo cuenta con su nombre, categoría publicitaria, duración en segundos y color representativo. Son los únicos evaluados en los modelos comparativos e inferenciales.
* **Intervalos Neutrales Inter-Estímulo:** Pausas fisiológicas de descanso/lavado cognitivo (ej: 10s o 15s) para disipar la excitación previa y restaurar la línea base electroencefalográfica antes del siguiente estímulo.
* **Exclusión Metodológica Estricta:** Los bloques neutrales se cortan y dividen en los archivos CSV (quedando disponibles para descarga), pero **NO se toman en cuenta como estímulo** en las pruebas de Shapiro-Wilk, ANOVA, contrastes Post-Hoc ni en el dictamen final del estímulo ganador.
* **Barra de Configuración Rápida:** Botones de 1 solo clic para definir cantidad de estímulos (2, 3, 4 o 5), aplicar duraciones simultáneas a todos los estímulos o a todos los neutrales, y plantillas predefinidas (Test Publicitario TV, Empaque y Degustación).

---

## 📊 Gráficas Porcentuales y Visualizaciones Científicas

Las visualizaciones presentan escalas normalizadas en porcentaje (0-100% y potencia relativa %):

1. **Gráfica 1: Línea Temporal de la Sesión (%):**
   * Curvas continuas de Percepción (%) y Emoción (%) con sombreado distintivo por bloque.
   * *Explicación Estadística al pie:* Detalla la estabilidad del enganche, picos porcentuales y la evolución temporal del consumidor.
2. **Gráfica 2: Comparativa de Medias (%):**
   * Barras agrupadas de Percepción frente a Emoción con barras de error ($\pm DE$).
   * *Explicación Estadística al pie:* Compara las medias ($\bar{X}$), cuantifica la ventaja porcentual del estímulo líder sobre los demás y reporta la homogeneidad de la respuesta.
3. **Gráfica 3: Huella Espectral Neurofisiológica (% Potencia):**
   * Gráfico de radar polar con la potencia espectral relativa en las 8 bandas electroencefalográficas (Delta, Theta, Alpha, Beta, Gamma).
   * **Presentación exclusivamente gráfica** (sin caja de interpretación redundante).
4. **Gráfica 4: Dinámica Fina Segundo a Segundo (Combinación de Estímulos):**
   * **Un solo gráfico consolidado** que combina y compara en tiempo relativo ($0s \to Ns$) o en secuencia continua todos los estímulos evaluados simultáneamente.
   * Cuenta con selectores directos de visualización: *🔄 Percepción + Emoción*, *🎯 Solo Percepción*, *💖 Solo Emoción*, *📈 Secuencia Continua*.
   * **Presentación exclusivamente gráfica** (sin caja de interpretación redundante).

---

## 📈 Módulo de Estadística Inferencial y Contraste de Hipótesis

Al pie del reporte se despliega el análisis inferencial riguroso:

1. **Test de Normalidad de Shapiro-Wilk ($W$):**
   * Evalúa tanto para Percepción (Atención) como para Emoción (Meditación) si las respuestas de la muestra siguen una distribución normal ($H_0: p > 0.05$).
2. **Análisis de Varianza de Medidas Repetidas (ANOVA):**
   * Calcula la Suma de Cuadrados ($SS_{\text{estímulos}}$, $SS_{\text{sujetos}}$, $SS_{\text{error}}$), grados de libertad ($gl$), Cuadrados Medios ($MS$), estadístico $F$, valor $p$ y tamaño del efecto ($\eta_p^2$ - Eta cuadrado parcial).
   * Dictamina formalmente si existen diferencias estadísticamente significativas ($p < 0.05$).
3. **Comparaciones Múltiples Post-Hoc (Tukey HSD):**
   * Contrasta cada par de estímulos ($\Delta$, $SE$, $q$, $p$-valor ajustado) certificando qué variantes son estadísticamente superiores entre sí.

---

## 🏆 Dictamen y Conclusión Ejecutiva

El banner final sintetiza el objetivo de investigación y declara formalmente:
> **RECOMENDACIÓN FINAL DEL LABORATORIO:**
> *"El estímulo que se DEBERÍA UTILIZAR según el objetivo de investigación es: [NOMBRE DEL ESTÍMULO], debido a que..."*
> - Presenta su ventaja porcentual en Percepción ($\bar{X}\%$) y en Emoción ($\bar{X}\%$).
> - Se respalda en la significancia estadística del ANOVA ($F, p < 0.05$).
> - Brinda una recomendación comercial clara para el equipo de marketing.

---

## 📁 Archivos de Prueba

En la carpeta **`muestras_ejemplo/`** dispones de archivos listos para usar o presiona el botón **"Cargar 5 Sujetos Demo"** para poblar el sistema y observar el análisis completo al instante.
