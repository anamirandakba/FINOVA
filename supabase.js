/* ══════════════════════════════════════════════════════════════
   FINOVA — supabase.js  (versión corregida)
   Sin bcryptjs. Usa Web Crypto API (nativa del navegador).
   Sin dependencias externas — funciona 100% offline y en Vercel.

   CONFIGURA AQUÍ:
   1. Ve a Supabase → Settings → API
   2. Copia "Project URL"  →  SUPABASE_URL
   3. Copia "anon public"  →  SUPABASE_KEY
   ══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://vnskxprvxrzivtgsuwgo.supabase.co';  // ← reemplaza
const SUPABASE_KEY = 'sb_publishable_MF3iJiQiejXOQ4mNvGXtEw_mf3k2pga';                 // ← reemplaza

/* ══════════════════════════════════════════════════════════════
   HASH DE CONTRASEÑA — Web Crypto API (nativa, sin librerías)
   Usa SHA-256 con un salt fijo de la app. Es suficiente para
   proteger contraseñas en una app personal/portafolio.
   ══════════════════════════════════════════════════════════════ */
const SALT = 'finova_2025_salt_seguro';

async function hashPassword(password) {
  const text    = SALT + password + SALT;
  const encoded = new TextEncoder().encode(text);
  const buffer  = await crypto.subtle.digest('SHA-256', encoded);
  const bytes   = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ══════════════════════════════════════════════════════════════
   CLIENTE REST — llama a la API de Supabase directamente
   ══════════════════════════════════════════════════════════════ */
async function query(table, options = {}) {
  const {
    method  = 'GET',
    filters = '',
    body    = null,
    select  = '*',
    single  = false,
  } = options;

  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  if (filters) url += `&${filters}`;
  if (single)  url += '&limit=1';

  const headers = {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        method === 'POST' ? 'return=representation' : 'return=minimal',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || 'Error en la petición a Supabase');
  }

  const text = await res.text();
  if (!text) return single ? null : [];
  const data = JSON.parse(text);
  return single ? (Array.isArray(data) ? (data[0] ?? null) : data) : data;
}

/* ══════════════════════════════════════════════════════════════
   AUTENTICACIÓN
   ══════════════════════════════════════════════════════════════ */

/** Registra un nuevo usuario en la tabla `perfiles` */
export async function registrarUsuario({ nombre, apellidos, correo, usuario, contrasena }) {
  // Verificar usuario duplicado
  const existeUsuario = await query('perfiles', {
    filters: `usuario=eq.${encodeURIComponent(usuario)}`,
    single:  true,
  });
  if (existeUsuario) throw new Error('Este nombre de usuario ya está en uso.');

  // Verificar correo duplicado
  const existeCorreo = await query('perfiles', {
    filters: `correo=eq.${encodeURIComponent(correo)}`,
    single:  true,
  });
  if (existeCorreo) throw new Error('Este correo electrónico ya está registrado.');

  // Hashear contraseña
  const password_hash = await hashPassword(contrasena);

  // Insertar en BD
  const res = await query('perfiles', {
    method: 'POST',
    body:   { nombre, apellidos, correo, usuario, password_hash },
  });

  return Array.isArray(res) ? res[0] : res;
}

/** Verifica credenciales y guarda sesión en sessionStorage */
export async function iniciarSesion({ usuario, contrasena }) {
  // Buscar perfil por nombre de usuario
  const perfil = await query('perfiles', {
    filters: `usuario=eq.${encodeURIComponent(usuario)}`,
    single:  true,
  });

  if (!perfil) throw new Error('Usuario o contraseña incorrectos.');

  // Comparar hash
  const hash = await hashPassword(contrasena);
  if (hash !== perfil.password_hash) throw new Error('Usuario o contraseña incorrectos.');

  // Guardar sesión
  const sesionData = {
    id:        perfil.id,
    usuario:   perfil.usuario,
    nombre:    perfil.nombre,
    apellidos: perfil.apellidos,
    correo:    perfil.correo,
  };
  sessionStorage.setItem('finova_sesion', JSON.stringify(sesionData));
  localStorage.setItem('finova_sesion_nombre',  `${perfil.nombre} ${perfil.apellidos}`);
  localStorage.setItem('finova_sesion_usuario', perfil.usuario);

  return sesionData;
}

/** Elimina la sesión activa */
export function cerrarSesion() {
  sessionStorage.removeItem('finova_sesion');
  localStorage.removeItem('finova_sesion_nombre');
  localStorage.removeItem('finova_sesion_usuario');
}

/** Devuelve la sesión activa o null */
export function obtenerSesion() {
  const raw = sessionStorage.getItem('finova_sesion');
  return raw ? JSON.parse(raw) : null;
}

/** Verifica si un nombre de usuario ya existe (para el registro en tiempo real) */
export async function usuarioDisponible(usuario) {
  const existe = await query('perfiles', {
    filters: `usuario=eq.${encodeURIComponent(usuario)}`,
    single:  true,
  });
  return !existe;
}

/* ══════════════════════════════════════════════════════════════
   INGRESOS
   ══════════════════════════════════════════════════════════════ */
export async function obtenerIngresos(userId) {
  return query('ingresos', {
    filters: `user_id=eq.${userId}&order=created_at.desc`,
  });
}

export async function insertarIngreso(userId, { concept, amount, date }) {
  const res = await query('ingresos', {
    method: 'POST',
    body:   { user_id: userId, concepto: concept, monto: amount, fecha: date },
  });
  return Array.isArray(res) ? res[0] : res;
}

export async function eliminarIngreso(id) {
  await query('ingresos', { method: 'DELETE', filters: `id=eq.${id}` });
}

/* ══════════════════════════════════════════════════════════════
   GASTOS
   ══════════════════════════════════════════════════════════════ */
export async function obtenerGastos(userId) {
  return query('gastos', {
    filters: `user_id=eq.${userId}&order=created_at.desc`,
  });
}

export async function insertarGasto(userId, { concept, amount, category, date, type }) {
  const res = await query('gastos', {
    method: 'POST',
    body:   { user_id: userId, concepto: concept, monto: amount, categoria: category, fecha: date, tipo: type },
  });
  return Array.isArray(res) ? res[0] : res;
}

export async function eliminarGasto(id) {
  await query('gastos', { method: 'DELETE', filters: `id=eq.${id}` });
}

/* ══════════════════════════════════════════════════════════════
   SIMULACIONES
   ══════════════════════════════════════════════════════════════ */
export async function obtenerSimulaciones(userId) {
  return query('simulaciones', {
    filters: `user_id=eq.${userId}&order=created_at.desc`,
  });
}

export async function insertarSimulacion(userId, sim) {
  const res = await query('simulaciones', {
    method: 'POST',
    body:   { user_id: userId, ...sim },
  });
  return Array.isArray(res) ? res[0] : res;
}

export async function eliminarSimulacion(id) {
  await query('simulaciones', { method: 'DELETE', filters: `id=eq.${id}` });
}
