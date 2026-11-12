<script setup lang="ts">
import { computed, ref } from "vue";

/* ---------- Tipos ---------- */
type Severidad = "leve" | "moderada" | "grave";
type EstadoEstudio = "Informado" | "Pendiente";
type TabId = "ficha" | "alergias" | "antecedentes" | "evoluciones" | "estudios";

interface Paciente {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  sexo: string;
  grupoSanguineo: string;
  telefono: string;
  email: string;
  domicilio: string;
  obraSocial: string;
  nroAfiliado: string;
  contactoEmergencia: string;
}
interface Alergia {
  id: number;
  agente: string;
  reaccion: string;
  severidad: Severidad;
  fecha: string;
  registradaPor: string;
}
interface Antecedente {
  id: number;
  parentesco: string;
  condicion: string;
  observaciones: string;
  fecha: string;
  registradoPor: string;
}
interface Evolucion {
  id: number;
  fecha: string;
  profesional: string;
  especialidad: string;
  motivo: string;
  descripcion: string;
  diagnostico: string;
  indicaciones: string;
}
interface Estudio {
  id: number;
  fecha: string;
  tipo: string;
  titulo: string;
  solicitadoPor: string;
  estado: EstadoEstudio;
  conclusion: string;
  valores: { parametro: string; resultado: string; referencia: string }[];
}

/* ---------- Datos de ejemplo (reemplazar por la API) ---------- */
const profesionalActual = { nombre: "Dra. Paula Ledesma", especialidad: "Clínica médica" };

/* Barra de navegación superior: `to` tiene que coincidir con el `path` de cada ruta en router/index.ts */
const navItems = [
  { label: "Admisión y turnos", to: "/admision-turnos" },
  { label: "Atención y enfermería", to: "/atencion-enfermeria" },
  { label: "Camas y recursos", to: "/recursos-camas" },
  { label: "Historia clínica", to: "/historia-clinica" },
  { label: "Facturación", to: "/facturacion-administracion" },
  { label: "Accesos", to: "/accesos" },
];

const pacientes = ref<Paciente[]>([
  {
    id: 1, nombre: "Carlos", apellido: "López", dni: "30.456.789",
    fechaNacimiento: "1984-03-12", sexo: "Masculino", grupoSanguineo: "A+",
    telefono: "03564 15-412345", email: "carlos.lopez@mail.com",
    domicilio: "Bv. Roca 1450, San Francisco, Córdoba",
    obraSocial: "OSDE 310", nroAfiliado: "0452-8891-02",
    contactoEmergencia: "María López (hermana) · 03564 15-998877",
  },
  {
    id: 2, nombre: "Ana", apellido: "Rojas", dni: "36.120.554",
    fechaNacimiento: "1991-09-27", sexo: "Femenino", grupoSanguineo: "0+",
    telefono: "03564 15-667788", email: "ana.rojas@mail.com",
    domicilio: "Av. del Libertador 820, San Francisco, Córdoba",
    obraSocial: "Swiss Medical SMG20", nroAfiliado: "7731-2200-15",
    contactoEmergencia: "Julián Rojas (esposo) · 03564 15-223344",
  },
  {
    id: 3, nombre: "Laura", apellido: "Gómez", dni: "27.884.310",
    fechaNacimiento: "1979-12-02", sexo: "Femenino", grupoSanguineo: "B-",
    telefono: "03564 15-554433", email: "laura.gomez@mail.com",
    domicilio: "Mitre 233, Brinkmann, Córdoba",
    obraSocial: "PAMI", nroAfiliado: "15-27884310-0",
    contactoEmergencia: "Sergio Gómez (hijo) · 03564 15-110022",
  },
]);

const alergias = ref<Record<number, Alergia[]>>({
  1: [
    { id: 1, agente: "Penicilina", reaccion: "Urticaria generalizada", severidad: "grave", fecha: "2024-05-14", registradaPor: "Dr. Silva" },
    { id: 2, agente: "Polen de gramíneas", reaccion: "Rinitis estacional", severidad: "leve", fecha: "2023-10-02", registradaPor: "Dra. Ledesma" },
  ],
  2: [{ id: 3, agente: "Ibuprofeno", reaccion: "Edema facial", severidad: "moderada", fecha: "2025-02-20", registradaPor: "Dra. Ledesma" }],
  3: [],
});

const antecedentes = ref<Record<number, Antecedente[]>>({
  1: [
    { id: 1, parentesco: "Padre", condicion: "Hipertensión arterial", observaciones: "Diagnosticada a los 50 años.", fecha: "2024-05-14", registradoPor: "Dr. Silva" },
    { id: 2, parentesco: "Abuela materna", condicion: "Diabetes tipo 2", observaciones: "", fecha: "2024-05-14", registradoPor: "Dr. Silva" },
  ],
  2: [{ id: 3, parentesco: "Madre", condicion: "Hipotiroidismo", observaciones: "En tratamiento con levotiroxina.", fecha: "2025-02-20", registradoPor: "Dra. Ledesma" }],
  3: [],
});

const evoluciones = ref<Record<number, Evolucion[]>>({
  1: [
    {
      id: 1, fecha: "2026-11-10T09:30", profesional: "Dr. Silva", especialidad: "Clínica médica",
      motivo: "Control de presión arterial",
      descripcion: "Paciente asintomático. TA 128/82, FC 74 lpm. Refiere buena adherencia al tratamiento.",
      diagnostico: "Hipertensión arterial controlada",
      indicaciones: "Continuar con la medicación actual. Control en 3 meses.",
    },
    {
      id: 2, fecha: "2026-08-04T11:15", profesional: "Dra. Ledesma", especialidad: "Clínica médica",
      motivo: "Dolor lumbar de 3 días",
      descripcion: "Dolor mecánico sin irradiación ni déficit neurológico. Contractura paravertebral.",
      diagnostico: "Lumbalgia mecánica",
      indicaciones: "Reposo relativo, calor local y analgesia por 5 días.",
    },
  ],
  2: [
    {
      id: 3, fecha: "2026-10-21T16:00", profesional: "Dra. Ledesma", especialidad: "Clínica médica",
      motivo: "Control anual",
      descripcion: "Examen físico sin hallazgos. Se solicitan estudios de rutina.",
      diagnostico: "Paciente sana",
      indicaciones: "Laboratorio de rutina y control en 12 meses.",
    },
  ],
  3: [],
});

const estudios = ref<Record<number, Estudio[]>>({
  1: [
    {
      id: 1, fecha: "2026-11-05", tipo: "Laboratorio", titulo: "Perfil lipídico",
      solicitadoPor: "Dr. Silva", estado: "Informado",
      conclusion: "Colesterol LDL levemente elevado. Resto de los valores dentro de rango.",
      valores: [
        { parametro: "Colesterol total", resultado: "212 mg/dL", referencia: "< 200 mg/dL" },
        { parametro: "LDL", resultado: "138 mg/dL", referencia: "< 130 mg/dL" },
        { parametro: "HDL", resultado: "52 mg/dL", referencia: "> 40 mg/dL" },
        { parametro: "Triglicéridos", resultado: "110 mg/dL", referencia: "< 150 mg/dL" },
      ],
    },
    {
      id: 2, fecha: "2026-08-06", tipo: "Imagen", titulo: "Radiografía de columna lumbar",
      solicitadoPor: "Dra. Ledesma", estado: "Informado",
      conclusion: "Sin lesiones óseas agudas. Rectificación de la lordosis fisiológica.",
      valores: [],
    },
  ],
  2: [
    {
      id: 3, fecha: "2026-11-08", tipo: "Laboratorio", titulo: "Hemograma completo",
      solicitadoPor: "Dra. Ledesma", estado: "Pendiente", conclusion: "", valores: [],
    },
  ],
  3: [],
});

/* ---------- Estado de la vista ---------- */
const busqueda = ref("");
const pacienteId = ref<number>(1);
const tabActiva = ref<TabId>("ficha");
const estudioAbierto = ref<Estudio | null>(null);

const mostrarFormAlergia = ref(false);
const mostrarFormAntecedente = ref(false);
const mostrarFormEvolucion = ref(false);

const nuevaAlergia = ref({ agente: "", reaccion: "", severidad: "leve" as Severidad });
const nuevoAntecedente = ref({ parentesco: "", condicion: "", observaciones: "" });
const nuevaEvolucion = ref({ motivo: "", descripcion: "", diagnostico: "", indicaciones: "" });

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "ficha", label: "Ficha del paciente", icon: "M16 21V19C16 16.8 14.2 15 12 15H6C3.8 15 2 16.8 2 19V21M9 11C11.2 11 13 9.2 13 7S11.2 3 9 3 5 4.8 5 7 6.8 11 9 11Z" },
  { id: "alergias", label: "Alergias", icon: "M12 3 22 20H2L12 3ZM12 10V14M12 17.2V17.3" },
  { id: "antecedentes", label: "Antecedentes familiares", icon: "M17 21V19a4 4 0 0 0-3-3.9M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8" },
  { id: "evoluciones", label: "Evoluciones médicas", icon: "M7 3H14L19 8V21H7V3ZM14 3V8H19M10 13H16M10 17H16" },
  { id: "estudios", label: "Estudios", icon: "M9 3H15M10 3V9L5 19a1.5 1.5 0 0 0 1.4 2H17.6a1.5 1.5 0 0 0 1.4-2L14 9V3" },
];

/* ---------- Computados ---------- */
const pacientesFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return pacientes.value;
  return pacientes.value.filter((p) =>
    `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase().includes(q),
  );
});

const paciente = computed(
  () => pacientes.value.find((p) => p.id === pacienteId.value)!,
);
const listaAlergias = computed(() => alergias.value[pacienteId.value] ?? []);
const listaAntecedentes = computed(() => antecedentes.value[pacienteId.value] ?? []);
const listaEvoluciones = computed(() =>
  [...(evoluciones.value[pacienteId.value] ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha)),
);
const listaEstudios = computed(() => estudios.value[pacienteId.value] ?? []);

const edad = computed(() => {
  const nac = new Date(paciente.value.fechaNacimiento + "T00:00");
  const hoy = new Date();
  let años = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) años--;
  return años;
});

const datosFicha = computed(() => {
  const p = paciente.value;
  return [
    { label: "Documento", valor: p.dni },
    { label: "Fecha de nacimiento", valor: `${fmtFecha(p.fechaNacimiento)} (${edad.value} años)` },
    { label: "Sexo", valor: p.sexo },
    { label: "Grupo sanguíneo", valor: p.grupoSanguineo },
    { label: "Teléfono", valor: p.telefono },
    { label: "Correo electrónico", valor: p.email },
    { label: "Domicilio", valor: p.domicilio },
    { label: "Obra social", valor: p.obraSocial },
    { label: "N.º de afiliado", valor: p.nroAfiliado },
    { label: "Contacto de emergencia", valor: p.contactoEmergencia },
  ];
});

/* ---------- Helpers ---------- */
function fmtFecha(iso: string) {
  const d = new Date(iso.length === 10 ? iso + "T00:00" : iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtFechaHora(iso: string) {
  const d = new Date(iso);
  return `${fmtFecha(iso)} · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} h`;
}
function ahoraISO() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function hoyISO() {
  return ahoraISO().slice(0, 10);
}
function iniciales(p: Paciente) {
  return `${p.nombre[0]}${p.apellido[0]}`;
}
function seleccionarPaciente(id: number) {
  pacienteId.value = id;
  tabActiva.value = "ficha";
  mostrarFormAlergia.value = false;
  mostrarFormAntecedente.value = false;
  mostrarFormEvolucion.value = false;
}
function nextId(lista: { id: number }[]) {
  return lista.reduce((max, x) => Math.max(max, x.id), 0) + 1;
}

/* ---------- Acciones (solo agregan: la HCE es inmutable) ---------- */
function registrarAlergia() {
  const a = nuevaAlergia.value;
  if (!a.agente.trim() || !a.reaccion.trim()) return;
  const lista = (alergias.value[pacienteId.value] ??= []);
  lista.unshift({
    id: nextId(lista), agente: a.agente.trim(), reaccion: a.reaccion.trim(),
    severidad: a.severidad, fecha: hoyISO(), registradaPor: profesionalActual.nombre,
  });
  nuevaAlergia.value = { agente: "", reaccion: "", severidad: "leve" };
  mostrarFormAlergia.value = false;
}
function registrarAntecedente() {
  const a = nuevoAntecedente.value;
  if (!a.parentesco.trim() || !a.condicion.trim()) return;
  const lista = (antecedentes.value[pacienteId.value] ??= []);
  lista.unshift({
    id: nextId(lista), parentesco: a.parentesco.trim(), condicion: a.condicion.trim(),
    observaciones: a.observaciones.trim(), fecha: hoyISO(), registradoPor: profesionalActual.nombre,
  });
  nuevoAntecedente.value = { parentesco: "", condicion: "", observaciones: "" };
  mostrarFormAntecedente.value = false;
}
function registrarEvolucion() {
  const e = nuevaEvolucion.value;
  if (!e.motivo.trim() || !e.descripcion.trim() || !e.diagnostico.trim()) return;
  const lista = (evoluciones.value[pacienteId.value] ??= []);
  lista.push({
    id: nextId(lista), fecha: ahoraISO(), profesional: profesionalActual.nombre,
    especialidad: profesionalActual.especialidad, motivo: e.motivo.trim(),
    descripcion: e.descripcion.trim(), diagnostico: e.diagnostico.trim(),
    indicaciones: e.indicaciones.trim(),
  });
  nuevaEvolucion.value = { motivo: "", descripcion: "", diagnostico: "", indicaciones: "" };
  mostrarFormEvolucion.value = false;
}
</script>

<template>
  <main class="hce-page">
    <!-- Panel lateral: marca y listado de pacientes -->
    <!-- Barra superior de ancho completo -->
    <header class="app-nav">
      <div class="brand-header">
        <div class="brand-logo">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="17" y="2" width="14" height="44" rx="4" fill="#38BDF8" />
            <rect x="2" y="17" width="44" height="14" rx="4" fill="#38BDF8" />
            <rect x="17" y="17" width="14" height="14" rx="2" fill="#DBF4FF" />
          </svg>
        </div>
        <div class="brand-text">
          <h2>Hospital-UTN</h2>
          <p>Sistema de Gestión Hospitalaria</p>
        </div>
      </div>

      <nav class="top-nav" aria-label="Navegación entre módulos">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link" active-class="active">
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="system-status">
        <span class="status-dot"></span>
        {{ profesionalActual.nombre }}
      </div>
    </header>

    <aside class="brand-panel">
      <div class="patients-block">
        <div class="brand-badge">
          <span class="badge-dot"></span>
          Pacientes
        </div>

        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <input v-model="busqueda" type="search" placeholder="Buscar por nombre o DNI" aria-label="Buscar paciente" />
        </div>

        <ul class="patient-list">
          <li v-for="p in pacientesFiltrados" :key="p.id">
            <button
              type="button"
              class="patient-item"
              :class="{ active: p.id === pacienteId }"
              @click="seleccionarPaciente(p.id)"
            >
              <span class="avatar">{{ iniciales(p) }}</span>
              <span class="patient-info">
                <strong>{{ p.apellido }}, {{ p.nombre }}</strong>
                <span>DNI {{ p.dni }}</span>
              </span>
            </button>
          </li>
          <li v-if="!pacientesFiltrados.length" class="empty-list">
            No hay pacientes que coincidan con la búsqueda.
          </li>
        </ul>
      </div>

      <footer class="brand-footer">
        <span class="footer-line"></span>
        <span>Hospital-UTN · Plataforma institucional</span>
      </footer>

      <div class="decorative-circle circle-one"></div>
      <div class="decorative-circle circle-two"></div>
    </aside>

    <!-- Panel de contenido -->
    <section class="content-panel">
      <div class="content-scroll">
        <!-- Cabecera del paciente -->
        <div class="card patient-header">
          <div class="patient-avatar">{{ iniciales(paciente) }}</div>
          <div class="patient-title">
            <p class="welcome-label">PACIENTE</p>
            <h1>{{ paciente.nombre }} {{ paciente.apellido }}</h1>
            <p class="patient-meta">
              {{ edad }} años · {{ paciente.sexo }} · DNI {{ paciente.dni }} · {{ paciente.obraSocial }}
            </p>
          </div>
          <div class="patient-tags">
            <span class="tag tag-blue">Grupo {{ paciente.grupoSanguineo }}</span>
            <span v-if="listaAlergias.length" class="tag tag-red">
              {{ listaAlergias.length }} {{ listaAlergias.length === 1 ? "alergia" : "alergias" }}
            </span>
            <span v-else class="tag tag-green">Sin alergias registradas</span>
          </div>
        </div>

        <!-- Pestañas -->
        <nav class="tabs" role="tablist" aria-label="Secciones de la historia clínica">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            role="tab"
            class="tab"
            :class="{ active: tabActiva === t.id }"
            :aria-selected="tabActiva === t.id"
            @click="tabActiva = t.id"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path :d="t.icon" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{{ t.label }}</span>
          </button>
        </nav>

        <!-- FICHA -->
        <div v-if="tabActiva === 'ficha'" class="card">
          <div class="card-head">
            <div>
              <p class="welcome-label">DATOS DEMOGRÁFICOS</p>
              <h3>Ficha del paciente</h3>
            </div>
          </div>
          <dl class="data-grid">
            <div v-for="d in datosFicha" :key="d.label" class="data-item">
              <dt>{{ d.label }}</dt>
              <dd>{{ d.valor }}</dd>
            </div>
          </dl>
        </div>

        <!-- ALERGIAS -->
        <div v-else-if="tabActiva === 'alergias'" class="card">
          <div class="card-head">
            <div>
              <p class="welcome-label">REGISTRO DE ALERGIAS</p>
              <h3>Alergias</h3>
            </div>
            <button class="submit-button compact" type="button" @click="mostrarFormAlergia = !mostrarFormAlergia">
              {{ mostrarFormAlergia ? "Cancelar" : "Registrar alergia" }}
            </button>
          </div>

          <form v-if="mostrarFormAlergia" class="inline-form" @submit.prevent="registrarAlergia">
            <div class="form-group">
              <label for="al-agente">Agente</label>
              <div class="input-wrapper"><input id="al-agente" v-model.trim="nuevaAlergia.agente" placeholder="Ej.: Penicilina" required /></div>
            </div>
            <div class="form-group">
              <label for="al-reaccion">Reacción</label>
              <div class="input-wrapper"><input id="al-reaccion" v-model.trim="nuevaAlergia.reaccion" placeholder="Ej.: Urticaria" required /></div>
            </div>
            <div class="form-group">
              <label for="al-sev">Severidad</label>
              <div class="input-wrapper">
                <select id="al-sev" v-model="nuevaAlergia.severidad">
                  <option value="leve">Leve</option>
                  <option value="moderada">Moderada</option>
                  <option value="grave">Grave</option>
                </select>
              </div>
            </div>
            <button class="submit-button" type="submit">Guardar alergia</button>
          </form>

          <ul v-if="listaAlergias.length" class="record-list">
            <li v-for="a in listaAlergias" :key="a.id" class="record">
              <span class="severity" :class="a.severidad"></span>
              <div class="record-body">
                <strong>{{ a.agente }}</strong>
                <span>{{ a.reaccion }}</span>
                <small>Registrada el {{ fmtFecha(a.fecha) }} por {{ a.registradaPor }}</small>
              </div>
              <span class="tag" :class="{ 'tag-red': a.severidad === 'grave', 'tag-amber': a.severidad === 'moderada', 'tag-green': a.severidad === 'leve' }">
                {{ a.severidad }}
              </span>
            </li>
          </ul>
          <p v-else class="empty-state">Este paciente no tiene alergias registradas. Usá “Registrar alergia” para agregar la primera.</p>
        </div>

        <!-- ANTECEDENTES -->
        <div v-else-if="tabActiva === 'antecedentes'" class="card">
          <div class="card-head">
            <div>
              <p class="welcome-label">HISTORIA FAMILIAR</p>
              <h3>Antecedentes familiares</h3>
            </div>
            <button class="submit-button compact" type="button" @click="mostrarFormAntecedente = !mostrarFormAntecedente">
              {{ mostrarFormAntecedente ? "Cancelar" : "Registrar antecedente" }}
            </button>
          </div>

          <form v-if="mostrarFormAntecedente" class="inline-form" @submit.prevent="registrarAntecedente">
            <div class="form-group">
              <label for="an-par">Parentesco</label>
              <div class="input-wrapper"><input id="an-par" v-model.trim="nuevoAntecedente.parentesco" placeholder="Ej.: Padre" required /></div>
            </div>
            <div class="form-group">
              <label for="an-con">Condición</label>
              <div class="input-wrapper"><input id="an-con" v-model.trim="nuevoAntecedente.condicion" placeholder="Ej.: Hipertensión arterial" required /></div>
            </div>
            <div class="form-group wide">
              <label for="an-obs">Observaciones</label>
              <div class="input-wrapper"><input id="an-obs" v-model.trim="nuevoAntecedente.observaciones" placeholder="Opcional" /></div>
            </div>
            <button class="submit-button" type="submit">Guardar antecedente</button>
          </form>

          <ul v-if="listaAntecedentes.length" class="record-list">
            <li v-for="a in listaAntecedentes" :key="a.id" class="record">
              <span class="avatar small">{{ a.parentesco[0] }}</span>
              <div class="record-body">
                <strong>{{ a.condicion }}</strong>
                <span>{{ a.parentesco }}<template v-if="a.observaciones"> · {{ a.observaciones }}</template></span>
                <small>Registrado el {{ fmtFecha(a.fecha) }} por {{ a.registradoPor }}</small>
              </div>
            </li>
          </ul>
          <p v-else class="empty-state">Todavía no hay antecedentes familiares cargados para este paciente.</p>
        </div>

        <!-- EVOLUCIONES -->
        <div v-else-if="tabActiva === 'evoluciones'" class="card">
          <div class="card-head">
            <div>
              <p class="welcome-label">NOTAS CLÍNICAS</p>
              <h3>Evoluciones médicas</h3>
            </div>
            <button class="submit-button compact" type="button" @click="mostrarFormEvolucion = !mostrarFormEvolucion">
              {{ mostrarFormEvolucion ? "Cancelar" : "Nueva evolución" }}
            </button>
          </div>

          <div class="immutable-note">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 10H19V21H5V10ZM8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>Las evoluciones no se pueden editar ni eliminar. Para corregir una nota, registrá una nueva evolución.</span>
          </div>

          <form v-if="mostrarFormEvolucion" class="inline-form" @submit.prevent="registrarEvolucion">
            <div class="form-group wide">
              <label for="ev-mot">Motivo de consulta</label>
              <div class="input-wrapper"><input id="ev-mot" v-model.trim="nuevaEvolucion.motivo" required /></div>
            </div>
            <div class="form-group wide">
              <label for="ev-des">Descripción</label>
              <textarea id="ev-des" v-model.trim="nuevaEvolucion.descripcion" rows="3" required></textarea>
            </div>
            <div class="form-group">
              <label for="ev-dia">Diagnóstico</label>
              <div class="input-wrapper"><input id="ev-dia" v-model.trim="nuevaEvolucion.diagnostico" required /></div>
            </div>
            <div class="form-group">
              <label for="ev-ind">Indicaciones</label>
              <div class="input-wrapper"><input id="ev-ind" v-model.trim="nuevaEvolucion.indicaciones" /></div>
            </div>
            <button class="submit-button" type="submit">Firmar y guardar evolución</button>
          </form>

          <ol v-if="listaEvoluciones.length" class="timeline">
            <li v-for="e in listaEvoluciones" :key="e.id" class="timeline-item">
              <span class="timeline-dot"></span>
              <div class="timeline-card">
                <div class="timeline-head">
                  <strong>{{ e.motivo }}</strong>
                  <small>{{ fmtFechaHora(e.fecha) }}</small>
                </div>
                <p class="timeline-author">{{ e.profesional }} · {{ e.especialidad }}</p>
                <p>{{ e.descripcion }}</p>
                <dl class="timeline-extra">
                  <div><dt>Diagnóstico</dt><dd>{{ e.diagnostico }}</dd></div>
                  <div v-if="e.indicaciones"><dt>Indicaciones</dt><dd>{{ e.indicaciones }}</dd></div>
                </dl>
              </div>
            </li>
          </ol>
          <p v-else class="empty-state">No hay evoluciones registradas. Usá “Nueva evolución” para cargar la primera consulta.</p>
        </div>

        <!-- ESTUDIOS -->
        <div v-else class="card">
          <div class="card-head">
            <div>
              <p class="welcome-label">RESULTADOS</p>
              <h3>Estudios</h3>
            </div>
          </div>

          <ul v-if="listaEstudios.length" class="record-list">
            <li v-for="s in listaEstudios" :key="s.id" class="record">
              <span class="avatar small">{{ s.tipo[0] }}</span>
              <div class="record-body">
                <strong>{{ s.titulo }}</strong>
                <span>{{ s.tipo }} · Solicitado por {{ s.solicitadoPor }}</span>
                <small>{{ fmtFecha(s.fecha) }}</small>
              </div>
              <span class="tag" :class="s.estado === 'Informado' ? 'tag-green' : 'tag-amber'">{{ s.estado }}</span>
              <button
                class="text-button"
                type="button"
                :disabled="s.estado === 'Pendiente'"
                @click="estudioAbierto = s"
              >
                Ver resultado
              </button>
            </li>
          </ul>
          <p v-else class="empty-state">Este paciente no tiene estudios cargados.</p>
        </div>

        <div class="copyright">© 2026 Hospital-UTN. Todos los derechos reservados.</div>
      </div>
    </section>

    <!-- Detalle de estudio -->
    <div v-if="estudioAbierto" class="overlay" role="dialog" aria-modal="true" @click.self="estudioAbierto = null">
      <div class="modal card">
        <div class="card-head">
          <div>
            <p class="welcome-label">{{ estudioAbierto.tipo.toUpperCase() }} · {{ fmtFecha(estudioAbierto.fecha) }}</p>
            <h3>{{ estudioAbierto.titulo }}</h3>
          </div>
          <button class="close-button" type="button" aria-label="Cerrar" @click="estudioAbierto = null">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <p class="modal-meta">Solicitado por {{ estudioAbierto.solicitadoPor }}</p>

        <div v-if="estudioAbierto.valores.length" class="table-wrap">
          <table>
            <thead>
              <tr><th>Parámetro</th><th>Resultado</th><th>Referencia</th></tr>
            </thead>
            <tbody>
              <tr v-for="v in estudioAbierto.valores" :key="v.parametro">
                <td>{{ v.parametro }}</td>
                <td><strong>{{ v.resultado }}</strong></td>
                <td>{{ v.referencia }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="conclusion">
          <strong>Conclusión</strong>
          <p>{{ estudioAbierto.conclusion }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  margin: 0;
}

:global(body) {
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  color: #14233d;
  -webkit-font-smoothing: antialiased;
}

:global(button),
:global(input),
:global(select),
:global(textarea) {
  font: inherit;
}

.hce-page {
  display: grid;
  grid-template-columns: minmax(280px, 0.36fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
  background: #f5f8fc;
}

/* ---------- PANEL LATERAL ---------- */

.brand-panel {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 32px 26px 22px;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(145deg, #102c46 0%, #0c2035 52%, #07182b 100%);
}

.brand-header,
.patients-block,
.brand-footer {
  position: relative;
  z-index: 2;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 13px;
}

.brand-logo {
  display: grid;
  width: 49px;
  height: 49px;
  flex-shrink: 0;
  place-items: center;
}

.brand-logo svg {
  width: 46px;
  height: 46px;
}

.brand-text h2 {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 750;
  letter-spacing: -0.6px;
}

.brand-text p {
  margin: 0;
  color: #a9bfd5;
  font-size: 12px;
}

.patients-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: 4px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 9px;
  padding: 9px 13px;
  border: 1px solid rgb(125 211 252 / 23%);
  border-radius: 30px;
  background: rgb(56 189 248 / 9%);
  color: #c1eafa;
  font-size: 12px;
  font-weight: 600;
}

.badge-dot,
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38bdf8;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  margin: 18px 0 14px;
  padding: 0 13px;
  border: 1px solid rgb(125 211 252 / 18%);
  border-radius: 10px;
  background: rgb(56 189 248 / 7%);
  color: #9eb4ca;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-box:focus-within {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgb(56 189 248 / 14%);
}

.search-box svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 12px;
}

.search-box input::placeholder {
  color: #7f97ae;
}

.patient-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0 2px 0 0;
  overflow-y: auto;
  list-style: none;
}

.patient-item {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.patient-item:hover {
  background: rgb(56 189 248 / 7%);
}

.patient-item.active {
  border-color: rgb(125 211 252 / 23%);
  background: rgb(56 189 248 / 12%);
}

.patient-item:focus-visible,
.tab:focus-visible,
.text-button:focus-visible,
.submit-button:focus-visible,
.close-button:focus-visible {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}

.avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid rgb(125 211 252 / 18%);
  border-radius: 13px;
  background: rgb(56 189 248 / 9%);
  color: #50c8f6;
  font-size: 13px;
  font-weight: 700;
}

.patient-info strong,
.patient-info span {
  display: block;
}

.patient-info strong {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 650;
}

.patient-info span {
  color: #9eb4ca;
  font-size: 11px;
}

.empty-list {
  padding: 12px;
  color: #9eb4ca;
  font-size: 12px;
  line-height: 1.6;
}

.brand-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: #8da5bd;
  font-size: 11px;
}

.footer-line {
  width: 24px;
  height: 2px;
  border-radius: 2px;
  background: #38bdf8;
}

.decorative-circle {
  position: absolute;
  z-index: -1;
  border: 1px solid rgb(125 211 252 / 8%);
  border-radius: 50%;
  pointer-events: none;
}

.circle-one {
  top: 52%;
  right: -190px;
  width: 340px;
  height: 340px;
  box-shadow: 0 0 0 42px rgb(125 211 252 / 2%), 0 0 0 84px rgb(125 211 252 / 2%);
}

.circle-two {
  bottom: -110px;
  left: -150px;
  width: 260px;
  height: 260px;
  box-shadow: 0 0 0 38px rgb(125 211 252 / 2%);
}

/* ---------- PANEL DE CONTENIDO ---------- */

.content-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  padding: 24px clamp(20px, 3.4vw, 52px) 0;
  background: radial-gradient(ellipse at 85% 10%, rgb(219 234 254 / 32%), transparent 38%), #f7f9fc;
}

.app-nav {
  position: relative;
  z-index: 10;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 12px clamp(20px, 3vw, 40px);
  color: #fff;
  background: linear-gradient(100deg, #07182b 0%, #0c2035 55%, #102c46 100%);
  border-bottom: 1px solid rgb(125 211 252 / 14%);
}

.app-nav .brand-logo,
.app-nav .brand-logo svg {
  width: 38px;
  height: 38px;
}

.app-nav .brand-text h2 {
  margin: 0 0 2px;
  font-size: 18px;
}

.app-nav .brand-text p {
  font-size: 11px;
}

.app-nav .system-status {
  margin-left: auto;
  color: #b2c3d7;
}

.portal-label {
  color: #8190a6;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.5px;
}

.top-nav {
  display: flex;
  flex: 1;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
}

.nav-link {
  flex-shrink: 0;
  padding: 10px 16px;
  border-radius: 10px;
  color: #b2c3d7;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: rgb(56 189 248 / 10%);
  color: #fff;
}

.nav-link.active {
  background: rgb(56 189 248 / 16%);
  box-shadow: inset 0 -2px 0 #38bdf8;
  color: #7dd3fc;
}

.nav-link:focus-visible {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}

.system-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #718198;
  font-size: 11px;
  white-space: nowrap;
}

.system-status .status-dot {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgb(34 197 94 / 10%);
}

.content-scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  padding: 4px 4px 18px;
  overflow-y: auto;
}

/* ---------- TARJETAS ---------- */

.card {
  padding: 26px 28px;
  border: 1px solid #e8edf4;
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 18px 55px rgb(20 41 69 / 5%), 0 3px 10px rgb(20 41 69 / 2%);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.welcome-label {
  margin: 0 0 9px;
  color: #1481dc;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.65px;
}

.card h1,
.card h3 {
  margin: 0;
  color: #13233e;
  letter-spacing: -0.8px;
}

.card h1 {
  font-size: 28px;
  font-weight: 760;
}

.card h3 {
  font-size: 22px;
  font-weight: 750;
}

.patient-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.patient-avatar {
  display: grid;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid #d9eaff;
  border-radius: 18px;
  background: linear-gradient(145deg, #eef7ff, #dbeafe);
  color: #0875db;
  font-size: 22px;
  font-weight: 760;
}

.patient-title {
  flex: 1;
  min-width: 220px;
}

.patient-title .welcome-label {
  margin-bottom: 6px;
}

.patient-meta {
  margin: 8px 0 0;
  color: #7a899e;
  font-size: 13px;
}

.patient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-block;
  padding: 5px 11px;
  border-radius: 30px;
  font-size: 11px;
  font-weight: 650;
  text-transform: capitalize;
  white-space: nowrap;
}

.tag-blue { background: #eaf4ff; color: #0b64b8; }
.tag-green { background: #e8f8ee; color: #15803d; }
.tag-amber { background: #fff4de; color: #a55f00; }
.tag-red { background: #fdeaea; color: #b42318; }

/* ---------- PESTAÑAS ---------- */

/* Ningún bloque del contenido se comprime: el scroll lo maneja .content-scroll */
.content-scroll > * {
  flex-shrink: 0;
}

.tabs {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 6px;
  padding: 5px;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid #e8edf4;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 16px rgb(20 41 69 / 6%);
}

.tab {
  flex-shrink: 0;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 15px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #65758c;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.tab svg {
  width: 18px;
  height: 18px;
}

.tab:hover {
  background: #f1f6fc;
  color: #0875db;
}

.tab.active {
  background: linear-gradient(100deg, #0879d9, #078fca);
  box-shadow: 0 5px 13px rgb(8 121 217 / 20%);
  color: #fff;
}

/* ---------- DATOS ---------- */

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
  margin: 0;
}

.data-item {
  padding: 14px 16px;
  border: 1px solid #e8edf4;
  border-radius: 12px;
  background: #fafcff;
}

.data-item dt {
  margin-bottom: 6px;
  color: #8291a7;
  font-size: 11px;
  font-weight: 650;
}

.data-item dd {
  margin: 0;
  color: #1a2b44;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

/* ---------- LISTAS ---------- */

.record-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.record {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #e8edf4;
  border-radius: 12px;
  background: #fafcff;
}

.record-body {
  flex: 1;
  min-width: 0;
}

.record-body strong,
.record-body span,
.record-body small {
  display: block;
}

.record-body strong {
  margin-bottom: 4px;
  color: #1a2b44;
  font-size: 14px;
  font-weight: 650;
}

.record-body span {
  color: #5d6e85;
  font-size: 12px;
  line-height: 1.5;
}

.record-body small {
  margin-top: 5px;
  color: #8a97a9;
  font-size: 11px;
}

.avatar.small {
  width: 38px;
  height: 38px;
  border-color: #d9eaff;
  background: #eef7ff;
  color: #0875db;
}

.severity {
  width: 6px;
  align-self: stretch;
  flex-shrink: 0;
  border-radius: 6px;
}

.severity.leve { background: #22c55e; }
.severity.moderada { background: #f59e0b; }
.severity.grave { background: #ef4444; }

.empty-state {
  margin: 0;
  padding: 28px 16px;
  border: 1px dashed #d4deec;
  border-radius: 12px;
  color: #7a899e;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

/* ---------- LÍNEA DE TIEMPO ---------- */

.timeline {
  position: relative;
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0 0 0 26px;
  list-style: none;
}

.timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 6px;
  width: 2px;
  border-radius: 2px;
  background: #dbeafe;
  content: "";
}

.timeline-item {
  position: relative;
}

.timeline-dot {
  position: absolute;
  top: 20px;
  left: -26px;
  width: 14px;
  height: 14px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #1684e8;
  box-shadow: 0 0 0 1px #bfdcfa;
}

.timeline-card {
  padding: 16px 18px;
  border: 1px solid #e8edf4;
  border-radius: 12px;
  background: #fafcff;
  color: #3d4f67;
  font-size: 13px;
  line-height: 1.65;
}

.timeline-card p {
  margin: 0 0 10px;
}

.timeline-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.timeline-head strong {
  color: #1a2b44;
  font-size: 14px;
}

.timeline-head small {
  color: #8a97a9;
  font-size: 11px;
}

.timeline-card .timeline-author {
  margin-bottom: 8px;
  color: #1481dc;
  font-size: 11px;
  font-weight: 650;
}

.timeline-extra {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid #e8edf4;
}

.timeline-extra dt {
  color: #8291a7;
  font-size: 11px;
  font-weight: 650;
}

.timeline-extra dd {
  margin: 2px 0 0;
  color: #1a2b44;
  font-weight: 600;
}

.immutable-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 11px 13px;
  border: 1px solid #cfe4ff;
  border-radius: 8px;
  background: #f0f7ff;
  color: #185b9c;
  font-size: 12px;
  line-height: 1.6;
}

.immutable-note svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ---------- FORMULARIOS ---------- */

.inline-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
  margin-bottom: 22px;
  padding: 20px;
  border: 1px solid #e8edf4;
  border-radius: 14px;
  background: #fafcff;
}

.form-group {
  margin-bottom: 16px;
}

.form-group.wide,
.inline-form .submit-button {
  grid-column: 1 / -1;
}

.form-group > label {
  display: block;
  margin-bottom: 9px;
  color: #253750;
  font-size: 12px;
  font-weight: 650;
}

.input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 46px;
  padding: 0 13px;
  border: 1px solid #dce4ef;
  border-radius: 9px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper:focus-within,
textarea:focus {
  border-color: #1684e8;
  box-shadow: 0 0 0 3px rgb(22 132 232 / 10%);
}

.input-wrapper input,
.input-wrapper select {
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1a2b44;
  font-size: 12px;
}

.input-wrapper input::placeholder {
  color: #a4afbf;
}

textarea {
  width: 100%;
  padding: 12px 13px;
  border: 1px solid #dce4ef;
  border-radius: 9px;
  outline: 0;
  background: #fff;
  color: #1a2b44;
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  width: 100%;
  min-height: 46px;
  padding: 13px 17px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(100deg, #0879d9, #078fca);
  box-shadow: 0 5px 13px rgb(8 121 217 / 20%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.submit-button.compact {
  width: auto;
  min-height: 40px;
  padding: 10px 18px;
  font-size: 12px;
  white-space: nowrap;
}

.submit-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 19px rgb(8 121 217 / 27%);
  filter: brightness(1.04);
}

.submit-button:active {
  transform: translateY(0);
}

.text-button {
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: #0878d9;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
}

.text-button:hover:not(:disabled) {
  color: #0757a1;
  text-decoration: underline;
}

.text-button:disabled {
  color: #a4afbf;
  cursor: not-allowed;
}

/* ---------- MODAL DE ESTUDIO ---------- */

.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgb(7 24 43 / 55%);
}

.modal {
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  overflow-y: auto;
}

.close-button {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8493a8;
  cursor: pointer;
}

.close-button:hover {
  background: #f1f6fc;
  color: #0875db;
}

.close-button svg {
  width: 19px;
  height: 19px;
}

.modal-meta {
  margin: -8px 0 18px;
  color: #7a899e;
  font-size: 12px;
}

.table-wrap {
  margin-bottom: 18px;
  overflow-x: auto;
  border: 1px solid #e8edf4;
  border-radius: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th,
td {
  padding: 11px 14px;
  text-align: left;
}

th {
  background: #f4f8fd;
  color: #5d6e85;
  font-weight: 650;
}

tbody tr + tr td {
  border-top: 1px solid #eef2f8;
}

.conclusion {
  padding: 14px 16px;
  border: 1px solid #cfe4ff;
  border-radius: 10px;
  background: #f0f7ff;
  color: #185b9c;
  font-size: 13px;
  line-height: 1.6;
}

.conclusion p {
  margin: 6px 0 0;
}

.copyright {
  margin-top: auto;
  padding-top: 8px;
  color: #9aa6b7;
  font-size: 10px;
  text-align: center;
}

/* ---------- RESPONSIVE ---------- */

@media (max-width: 900px) {
  .hce-page {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    height: auto;
    overflow: visible;
  }

  .app-nav {
    position: sticky;
    top: 0;
    gap: 14px;
    padding: 10px 16px;
  }

  .app-nav .brand-text,
  .app-nav .system-status {
    display: none;
  }

  .brand-panel {
    height: auto;
    padding: 22px 20px;
  }

  .patients-block {
    margin-top: 22px;
  }

  .patient-list {
    max-height: 220px;
  }

  .content-panel {
    height: auto;
    padding: 20px 16px 0;
  }

  .content-scroll {
    overflow: visible;
  }

  .circle-one,
  .circle-two {
    display: none;
  }
}

@media (max-width: 560px) {
  .card {
    padding: 20px 16px;
  }

  .card-head {
    flex-direction: column;
  }

  .inline-form {
    grid-template-columns: 1fr;
  }

  .record {
    flex-wrap: wrap;
  }

  .card h1 {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>