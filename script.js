// Configuración inicial
console.log('Script iniciado');
const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Clases
class Usuario {
    constructor(nombre, usuario, password) {
        this.nombre = nombre;
        this.usuario = usuario;
        this.password = password;
        this.historial = [];
    }
}

class Simulacion {
    constructor(monto, cuotas, interes, usuario) {
        this.monto = parseFloat(monto);
        this.cuotas = parseInt(cuotas);
        this.interes = parseFloat(interes);
        this.usuario = usuario.usuario;
        this.fecha = new Date();
        this.calcularResultados();
    }

    calcularResultados() {
        const tasaMensual = this.interes / 12 / 100;
        this.cuotaMensual = (this.monto * tasaMensual * Math.pow(1 + tasaMensual, this.cuotas)) / 
                           (Math.pow(1 + tasaMensual, this.cuotas) - 1);
        this.totalPagado = this.cuotaMensual * this.cuotas;
        this.totalInteres = this.totalPagado - this.monto;
    }

    toJSON() {
        return {
            monto: this.monto,
            cuotas: this.cuotas,
            interes: this.interes,
            usuario: this.usuario,
            fecha: this.fecha,
            cuotaMensual: this.cuotaMensual,
            totalPagado: this.totalPagado,
            totalInteres: this.totalInteres
        };
    }
}

// Manejo de localStorage
const Storage = {
    guardarUsuarios: (usuarios) => {
        try {
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            console.log('Usuarios guardados:', usuarios);
            return true;
        } catch (error) {
            console.error('Error al guardar:', error);
            return false;
        }
    },
    obtenerUsuarios: () => {
        try {
            const usuarios = localStorage.getItem('usuarios');
            return usuarios ? JSON.parse(usuarios) : [
                { nombre: 'Elon Musk', usuario: 'elonmusk', password: 'TeslaSpaceX', historial: [] }
            ];
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            return [{ nombre: 'Elon Musk', usuario: 'elonmusk', password: 'TeslaSpaceX', historial: [] }];
        }
    }
};

// Variables globales
let usuarios = Storage.obtenerUsuarios();
let usuarioActual = null;
let tasasCambio = null;
let graficoHistorial = null;

const formatoMoneda = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

// Funciones de utilidad
function mostrarMensaje(elementId, mensaje, esError = true) {
    const elemento = document.getElementById(elementId);
    if (elemento) {
        elemento.textContent = mensaje;
        elemento.className = esError ? 'error' : 'success';
        elemento.style.display = mensaje ? 'block' : 'none';
    }
}

function limpiarFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const inputs = form.getElementsByTagName('input');
        Array.from(inputs).forEach(input => input.value = '');
    }
}

function mostrarComponente(id, mostrar = true) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.classList.toggle('hidden', !mostrar);
    }
}

// Funciones API y gráficos
async function obtenerTasasCambio() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        return {
            EUR: data.rates.EUR,
            GBP: data.rates.GBP,
            ARS: data.rates.ARS,
            BRL: data.rates.BRL
        };
    } catch (error) {
        console.error('Error tasas:', error);
        return null;
    }
}

async function mostrarTasasCambio() {
    const tasasInfo = document.getElementById('tasasInfo');
    if (!tasasInfo) return;

    const tasas = await obtenerTasasCambio();
    if (!tasas) {
        tasasInfo.innerHTML = '<p>Error al cargar tasas de cambio</p>';
        return;
    }

    tasasCambio = tasas;
    tasasInfo.innerHTML = `
        <p>1 USD = ${tasas.EUR.toFixed(2)} EUR</p>
        <p>1 USD = ${tasas.GBP.toFixed(2)} GBP</p>
        <p>1 USD = ${tasas.ARS.toFixed(2)} ARS</p>
        <p>1 USD = ${tasas.BRL.toFixed(2)} BRL</p>
    `;
}

function actualizarGrafico() {
    const ctx = document.getElementById('graficoHistorial');
    if (!ctx || !usuarioActual.historial.length) return;

    if (graficoHistorial) {
        graficoHistorial.destroy();
    }

    const datos = {
        labels: usuarioActual.historial.map(s => new Date(s.fecha).toLocaleDateString()),
        datasets: [{
            label: 'Montos de préstamos (USD)',
            data: usuarioActual.historial.map(s => s.monto),
            borderColor: '#007bff',
            tension: 0.1
        }, {
            label: 'Cuota Mensual (USD)',
            data: usuarioActual.historial.map(s => s.cuotaMensual),
            borderColor: '#28a745',
            tension: 0.1
        }]
    };

    graficoHistorial = new Chart(ctx, {
        type: 'line',
        data: datos,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Histórico de Préstamos'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'USD'
                    }
                }
            }
        }
    });
}

// Funciones principales
function registrarUsuario(event) {
    console.log('Iniciando registro');
    event.preventDefault();
    
    const nombre = document.getElementById('regNombre')?.value.trim();
    const usuario = document.getElementById('regUsuario')?.value.trim();
    const password = document.getElementById('regPassword')?.value;

    if (!nombre || !usuario || !password) {
        Swal.fire({
            title: 'Error',
            text: 'Complete todos los campos',
            icon: 'error'
        });
        return;
    }

    if (usuarios.some(u => u.usuario === usuario)) {
        Swal.fire({
            title: 'Error',
            text: 'Usuario ya existe',
            icon: 'error'
        });
        return;
    }

    try {
        const nuevoUsuario = new Usuario(nombre, usuario, password);
        usuarios.push(nuevoUsuario);
        
        if (Storage.guardarUsuarios(usuarios)) {
            console.log('Usuario registrado:', nuevoUsuario);
            Swal.fire({
                title: '¡Éxito!',
                text: 'Registro completado',
                icon: 'success'
            });
            limpiarFormulario('registroForm');
        }
    } catch (error) {
        console.error('Error registro:', error);
        Swal.fire({
            title: 'Error',
            text: 'Error al registrar usuario',
            icon: 'error'
        });
    }
}

function iniciarSesion(event) {
    event.preventDefault();
    const usuario = document.getElementById('loginUsuario')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!usuario || !password) {
        Swal.fire({
            title: 'Error',
            text: 'Complete todos los campos',
            icon: 'error'
        });
        return;
    }

    const usuarioEncontrado = usuarios.find(u => 
        u.usuario === usuario && u.password === password);

    if (usuarioEncontrado) {
        usuarioActual = usuarioEncontrado;
        if (!usuarioActual.historial) {
            usuarioActual.historial = [];
        }
        mostrarInterfazSimulador();
    } else {
        Swal.fire({
            title: 'Error',
            text: 'Credenciales incorrectas',
            icon: 'error'
        });
    }
}

async function mostrarInterfazSimulador() {
    mostrarComponente('registroForm', false);
    mostrarComponente('loginForm', false);
    mostrarComponente('simuladorContainer', true);
    mostrarComponente('graficoContainer', true);
    mostrarComponente('historialContainer', true);
    
    const datosUsuarioElement = document.getElementById('datosUsuario');
    if (datosUsuarioElement) {
        datosUsuarioElement.textContent = `Bienvenido, ${usuarioActual.nombre}`;
    }

    await mostrarTasasCambio();
    actualizarGrafico();
    actualizarHistorial();
}

async function realizarSimulacion(event) {
    event.preventDefault();
    
    try {
        const montoInput = document.getElementById('monto');
        const cuotasInput = document.getElementById('cuotas');
        const interesInput = document.getElementById('interes');

        if (!montoInput || !cuotasInput || !interesInput) {
            throw new Error('Campos no encontrados');
        }

        const monto = parseFloat(montoInput.value.replace(/[^\d.-]/g, ''));
        const cuotas = parseInt(cuotasInput.value);
        const interes = parseFloat(interesInput.value);

        if (isNaN(monto) || monto <= 0) {
            throw new Error('Monto inválido');
        }
        if (isNaN(cuotas) || cuotas <= 0) {
            throw new Error('Número de cuotas inválido');
        }
        if (isNaN(interes) || interes < 0) {
            throw new Error('Tasa de interés inválida');
        }

        const simulacion = new Simulacion(monto, cuotas, interes, usuarioActual);
        usuarioActual.historial.push(simulacion.toJSON());

        const indiceUsuario = usuarios.findIndex(u => u.usuario === usuarioActual.usuario);
        if (indiceUsuario !== -1) {
            usuarios[indiceUsuario] = {...usuarioActual};
            Storage.guardarUsuarios(usuarios);
        }

        await Swal.fire({
            title: 'Simulación Exitosa',
            html: `
                <div class="resultado-simulacion">
                    <p>Monto: ${formatoMoneda.format(simulacion.monto)}</p>
                    <p>Cuotas: ${simulacion.cuotas}</p>
                    <p>Interés: ${simulacion.interes}%</p>
                    <p>Cuota mensual: ${formatoMoneda.format(simulacion.cuotaMensual)}</p>
                    <p>Total a pagar: ${formatoMoneda.format(simulacion.totalPagado)}</p>
                    <p>Total intereses: ${formatoMoneda.format(simulacion.totalInteres)}</p>
                </div>
            `,
            icon: 'success'
        });

        actualizarHistorial();
        actualizarGrafico();

    } catch (error) {
        console.error('Error simulación:', error);
        Swal.fire({
            title: 'Error',
            text: error.message || 'Error en la simulación',
            icon: 'error'
        });
    }
}

function actualizarHistorial() {
    const tbody = document.querySelector('#historialTable tbody');
    if (!tbody || !usuarioActual.historial) return;

    tbody.innerHTML = '';
    
    usuarioActual.historial.forEach(simulacion => {
        try {
            const row = tbody.insertRow();
            const fecha = new Date(simulacion.fecha);
            
            row.innerHTML = `
                <td>${fecha.toLocaleDateString()}</td>
                <td>${formatoMoneda.format(simulacion.monto)}</td>
                <td>${simulacion.cuotas}</td>
                <td>${simulacion.interes}%</td>
                <td>${formatoMoneda.format(simulacion.cuotaMensual)}</td>
                <td>${formatoMoneda.format(simulacion.totalPagado)}</td>
            `;
        } catch (error) {
            console.error('Error en historial:', error);
        }
    });
}

function cerrarSesion(event) {
    if (event) event.preventDefault();
    
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "¿Está seguro?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
    }).then((result) => {
        if (result.isConfirmed) {
            usuarioActual = null;
            mostrarComponente('registroForm', true);
            mostrarComponente('loginForm', true);
            mostrarComponente('simuladorContainer', false);
            mostrarComponente('graficoContainer', false);
            limpiarFormulario('simuladorContainer');

            if (graficoHistorial) {
                graficoHistorial.destroy();
                graficoHistorial = null;
            }
            
            Swal.fire('Sesión cerrada', 'Ha cerrado sesión exitosamente', 'success');
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const btnRegistrar = document.getElementById('btnRegistrar');
    if (btnRegistrar) {
        btnRegistrar.onclick = function(e) {
            e.preventDefault();
            registrarUsuario(e);
        };
    }

    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) btnLogin.onclick = iniciarSesion;

    const btnSimular = document.getElementById('btnSimular');
    if (btnSimular) btnSimular.onclick = realizarSimulacion;

    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) btnCerrarSesion.onclick = cerrarSesion;
});