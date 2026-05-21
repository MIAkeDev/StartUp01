/**
 * WORKIFY — Script de seed
 * Crea el usuario administrador y datos de prueba
 *
 * Uso: node scripts/seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@workify.pe';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_NOMBRE   = 'Administrador Workify';
const ADMIN_WHATSAPP = process.env.WHATSAPP_ADMIN_NUMBER?.replace(/\D/g,'').slice(-9) || '999999999';

async function crearAdmin() {
  console.log('\n📋 Verificando usuario administrador...');

  // Ver si ya existe
  const { data: existing } = await supabaseAdmin
    .from('usuarios')
    .select('id, email')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (existing) {
    console.log(`✅ Admin ya existe: ${existing.email}`);
    return existing.id;
  }

  // Crear en auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email:          ADMIN_EMAIL,
    password:       ADMIN_PASSWORD,
    email_confirm:  true
  });

  if (authError) {
    console.error('❌ Error creando auth:', authError.message);
    throw authError;
  }

  // Crear perfil
  const { error: profileError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id:       authData.user.id,
      email:    ADMIN_EMAIL,
      nombre:   ADMIN_NOMBRE,
      whatsapp: ADMIN_WHATSAPP,
      rol:      'admin'
    });

  if (profileError) {
    console.error('❌ Error creando perfil admin:', profileError.message);
    throw profileError;
  }

  console.log(`✅ Admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  return authData.user.id;
}

async function crearUsuarioPrueba() {
  console.log('\n📋 Creando usuario de prueba...');

  const email = 'usuario@prueba.pe';
  const { data: existing } = await supabaseAdmin
    .from('usuarios').select('id').eq('email', email).single();

  if (existing) {
    console.log('✅ Usuario de prueba ya existe');
    return existing.id;
  }

  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email, password: 'Test123!', email_confirm: true
  });

  if (error) { console.error('⚠️ Error usuario prueba:', error.message); return null; }

  await supabaseAdmin.from('usuarios').insert({
    id: authData.user.id, email,
    nombre: 'Carlos Mamani', whatsapp: '987654321', rol: 'user'
  });

  console.log(`✅ Usuario prueba: ${email} / Test123!`);
  return authData.user.id;
}

async function crearDatosPrueba(adminId, userId) {
  console.log('\n📋 Creando datos de prueba...');

  // Verificar si ya hay publicaciones
  const { count } = await supabaseAdmin
    .from('publicaciones').select('id', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`✅ Ya existen ${count} publicaciones`);
    return;
  }

  const ahora = new Date();
  const en20  = new Date(ahora); en20.setDate(en20.getDate() + 20);
  const en10  = new Date(ahora); en10.setDate(en10.getDate() + 10);

  const publicaciones = [
    {
      usuario_id: userId || adminId,
      tipo: 'oferta',
      titulo: 'Electricista certificado para proyecto residencial',
      descripcion: 'Buscamos electricista con experiencia en instalaciones residenciales y comerciales. Trabajo en Miraflores y San Isidro.',
      ubicacion: 'Miraflores, Lima',
      destacado: true,
      fecha_fin: en20.toISOString(),
      detalles: {
        categoria: 'electricidad',
        tipo_contrato: 'Por proyecto',
        modalidad: 'presencial',
        requisitos: 'Certificación vigente, mínimo 3 años de experiencia, herramientas propias.',
        telefono_contacto: '987000001',
        email_contacto: 'obra@constructora.pe',
        plan: 'destacado'
      }
    },
    {
      usuario_id: userId || adminId,
      tipo: 'oferta',
      titulo: 'Pintor de interiores – Proyecto Miraflores',
      descripcion: 'Requerimos pintor para trabajo de interiores en departamento de 3 habitaciones. Material proporcionado.',
      ubicacion: 'Miraflores, Lima',
      destacado: false,
      fecha_fin: en10.toISOString(),
      detalles: {
        categoria: 'pintura',
        tipo_contrato: 'Por proyecto',
        modalidad: 'presencial',
        requisitos: 'Experiencia en pintura de interiores, referencias laborales.',
        telefono_contacto: '987000002',
        plan: 'basico'
      }
    },
    {
      usuario_id: userId || adminId,
      tipo: 'oferta',
      titulo: 'Desarrollador Frontend – React.js',
      descripcion: 'Startup de tecnología busca desarrollador frontend con experiencia en React. Proyecto de 3 meses renovable.',
      ubicacion: 'Remoto',
      destacado: true,
      fecha_fin: en20.toISOString(),
      detalles: {
        categoria: 'tecnologia',
        tipo_contrato: 'Por proyecto',
        modalidad: 'remoto',
        requisitos: '+2 años en React, TypeScript deseable, portfolio requerido.',
        email_contacto: 'rrhh@startup.pe',
        plan: 'destacado'
      }
    },
    {
      usuario_id: userId || adminId,
      tipo: 'servicio',
      titulo: 'Gasfitero profesional a domicilio – Arequipa',
      descripcion: 'Servicio de gasfitería residencial y comercial. Detección de fugas, instalación de tuberías, mantenimiento de sistemas sanitarios.',
      ubicacion: 'Arequipa',
      destacado: true,
      fecha_fin: en20.toISOString(),
      detalles: {
        categoria: 'fontaneria',
        experiencia: '8',
        precio_aprox: '80 - 200',
        numero_wsp: '959000001',
        plan: 'destacado'
      }
    },
    {
      usuario_id: userId || adminId,
      tipo: 'servicio',
      titulo: 'Electricista domiciliario – Lima',
      descripcion: 'Instalaciones eléctricas, tableros, tomacorrientes, luminarias LED, detección de fallas. Trabajo garantizado.',
      ubicacion: 'Lima',
      destacado: false,
      fecha_fin: en10.toISOString(),
      detalles: {
        categoria: 'electricidad',
        experiencia: '5',
        precio_aprox: '60 - 150',
        numero_wsp: '959000002',
        plan: 'basico'
      }
    },
    {
      usuario_id: userId || adminId,
      tipo: 'servicio',
      titulo: 'Pintor de casas y departamentos – Lima Sur',
      descripcion: 'Pintura interior y exterior, temple, látex, barniz, acabados premium. Presupuesto sin compromiso.',
      ubicacion: 'Lima Sur',
      destacado: false,
      fecha_fin: en10.toISOString(),
      detalles: {
        categoria: 'pintura',
        experiencia: '10',
        precio_aprox: '12 por m²',
        numero_wsp: '959000003',
        plan: 'basico'
      }
    }
  ];

  const { error } = await supabaseAdmin.from('publicaciones').insert(publicaciones);
  if (error) console.error('⚠️ Error insertando publicaciones:', error.message);
  else       console.log(`✅ ${publicaciones.length} publicaciones de prueba creadas`);
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  WORKIFY — Script de inicialización   ');
  console.log('═══════════════════════════════════════');

  try {
    const adminId = await crearAdmin();
    const userId  = await crearUsuarioPrueba();
    await crearDatosPrueba(adminId, userId);

    console.log('\n✅ Seed completado exitosamente');
    console.log('\n── Credenciales ───────────────────────');
    console.log(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`  Usuario: usuario@prueba.pe / Test123!`);
    console.log('───────────────────────────────────────\n');
  } catch (err) {
    console.error('\n❌ Error en seed:', err.message);
    process.exit(1);
  }
}

main();
