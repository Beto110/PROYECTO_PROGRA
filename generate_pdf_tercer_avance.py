from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=15)

# 1. Portada
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 20, "Universidad Gerardo Barrios", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 14)
pdf.cell(0, 10, "Facultad de Ciencia y Tecnología", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 10, "Asignatura: Programación Computacional IV", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 10, "Docente: Ing. William Alexis Montes Girón", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(10)
pdf.set_font("helvetica", "B", 18)
pdf.cell(0, 15, 'Proyecto: "Sistema Web de Control de Inventario y Ventas (InvenWeb)"', align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(20)

pdf.set_font("helvetica", "B", 14)
pdf.cell(0, 10, "Tercer Avance del Proyecto", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(20)

pdf.set_font("helvetica", "B", 12)
pdf.cell(0, 10, "Integrantes:", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
integrantes = [
    "Alberto Jose Velasquez Paz",
    "Ricardo Alberto Mendiola Hernández",
    "Luis Angel Zúniga Menjivar",
    "Victor Arnoldo Iglesias Sandoval",
    "Shelsy Rubi Melendez Rodríguez"
]
for p in integrantes:
    pdf.cell(0, 8, f"- {p}", align="L", new_x="LMARGIN", new_y="NEXT")

pdf.ln(30)
pdf.cell(0, 10, "Fecha: 31 de mayo de 2026", align="C", new_x="LMARGIN", new_y="NEXT")

# 3. Índice
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "Índice", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
indice_items = [
    ("1. Portada", 1),
    ("2. Introducción al Tercer Avance", 3),
    ("3. Módulos Implementados en el Tercer Avance", 4),
    ("4. Módulos Faltantes por Desarrollar", 4),
    ("5. Descripción de Pruebas a Implementar", 5)
]
for item in indice_items:
    pdf.cell(150, 10, item[0])
    pdf.cell(40, 10, str(item[1]), align="R", new_x="LMARGIN", new_y="NEXT")

# 2. Introducción
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "2. Introducción al Tercer Avance", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
intro_text = (
    "El presente documento expone los avances desarrollados correspondientes al Tercer Avance del "
    "proyecto 'Sistema Web de Control de Inventario y Ventas (InvenWeb)'. En esta fase, el equipo "
    "se ha enfocado en entregar un prototipo avanzado y completamente funcional, asegurando "
    "la navegacion completa de la aplicacion con la mayoria de modulos y secciones accesibles.\n\n"
    "Se ha dado cumplimiento a los requerimientos de prioridad alta y media establecidos en entregas "
    "anteriores, incorporando todas las operaciones necesarias de la base de datos (CRUD completo) "
    "para el correcto funcionamiento del sistema. Ademas, se ha garantizado que los formularios "
    "implementados cuenten con sus debidas validaciones, proporcionando mayor robustez y previniendo "
    "la insercion de datos inconsistentes por parte de los usuarios."
)
pdf.multi_cell(0, 8, intro_text)

# 4. Módulos implementados y faltantes
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "3. Modulos Implementados (Tercer Avance)", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
impl_text = (
    "En este tercer avance, se han logrado implementar y validar las siguientes funcionalidades:\n\n"
    "1. Navegacion Completa: Interfaz grafica intuitiva con todas las rutas accesibles mediante un "
    "sistema de navegacion funcional.\n"
    "2. Implementacion Completa del CRUD (Inventario): Operaciones de Crear, Leer, Actualizar y Eliminar "
    "para los modulos de Categorias y Productos conectadas correctamente a la base de datos.\n"
    "3. Validaciones de Formularios: Todos los formularios de ingreso de datos (Login, Productos, Categorias) "
    "cuentan con validaciones de campos requeridos y formatos validos tanto en frontend como backend.\n"
    "4. Base de Datos Funcional: Integracion adecuada de entidades y relaciones para registrar ventas, "
    "calcular existencias en tiempo real y manejar detalles de transacciones.\n"
    "5. Modulo de Ventas Avanzado: Calculo correcto de totales y reduccion del stock en tiempo real "
    "al confirmar una compra."
)
pdf.multi_cell(0, 8, impl_text)

pdf.ln(10)
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "4. Modulos Faltantes por Desarrollar", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
faltantes_text = (
    "Para la entrega final del proyecto, restan los siguientes requerimientos por pulir y finalizar:\n\n"
    "- Reportes e Historial (Dashboards): Modulo administrativo que permita visualizar estadisticas "
    "de ventas y graficos de ingresos generados.\n"
    "- Impresion de Comprobantes PDF: Generacion de facturas descargables al momento de finalizar una venta.\n"
    "- Autenticacion y Autorizacion Avanzada: Reforzamiento de los roles (Admin vs Cajero) en todas las "
    "vistas y peticiones para evitar accesos no autorizados a ciertas operaciones."
)
pdf.multi_cell(0, 8, faltantes_text)

# 5. Pruebas
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "5. Descripcion de Pruebas a Implementar", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
pruebas_text = (
    "Para verificar el correcto funcionamiento y el estado del sistema previo a la entrega final, se "
    "implementaran los siguientes tipos de pruebas:\n\n"
    "1. Pruebas Unitarias (Unit Testing): Se evaluaran las funciones criticas del sistema de forma aislada, "
    "como el calculo de totales en el carrito de ventas, y la reduccion correcta del stock al procesar "
    "una transaccion.\n\n"
    "2. Pruebas de Integracion: Se verificara la correcta comunicacion entre los endpoints de la API "
    "(backend) y la base de datos, asegurando que las operaciones CRUD afecten correctamente las tablas "
    "relacionadas sin romper la integridad referencial.\n\n"
    "3. Pruebas de Validacion de Formularios (Negative Testing): Se enviaran datos invalidos (campos vacios, "
    "numeros negativos en precios, textos largos) a los formularios para comprobar que el sistema responda "
    "con los mensajes de error adecuados y no genere fallos en el servidor.\n\n"
    "4. Pruebas de Interfaz de Usuario (UI/Navegabilidad): Se recorrera la aplicacion en diferentes "
    "resoluciones (Responsive) simulando los roles de usuario, asegurando que los modulos sean "
    "accesibles, legibles y los botones funcionen como se espera."
)
pdf.multi_cell(0, 8, pruebas_text)

pdf.output("Tercer_Avance_InvenWeb.pdf")
