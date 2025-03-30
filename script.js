// Clases para los dispositivos
class Dispositivo {
    constructor(tipo, id) {
        this.tipo = tipo;
        this.id = id;
        this.estado = 'conectado';
        this.operacionesPendientes = [];
        this.driver = `${tipo}_driver.sys`;
        this.connectedAt = new Date();
        this.enError = false;
        this.visibleProperties = {
            'Tipo': tipo,
            'ID': id,
            'Estado': 'conectado',
            'Driver': `${tipo}_driver.sys`
        };
        this.hiddenProperties = {
            'Dirección E/S': `0x${Math.floor(Math.random() * 65535).toString(16)}`,
            'IRQ': Math.floor(Math.random() * 15) + 1,
            'Buffer Size': `${Math.floor(Math.random() * 1024) + 256} KB`,
            'Prioridad': Math.floor(Math.random() * 5) + 1,
            'Tiempo de conexión': this.connectedAt.toLocaleTimeString()
        };
    }
    
    operacionEntrada() {
        const opId = `op_${this.tipo}_${Date.now()}`;
        this.operacionesPendientes.push({
            id: opId,
            tipo: 'entrada',
            estado: 'pendiente',
            dispositivo: this.id,
            timestamp: new Date()
        });
        return opId;
    }
    
    operacionSalida(datos) {
        const opId = `op_${this.tipo}_${Date.now()}`;
        this.operacionesPendientes.push({
            id: opId,
            tipo: 'salida',
            estado: 'pendiente',
            dispositivo: this.id,
            datos: datos,
            timestamp: new Date()
        });
        return opId;
    }
    
    completarOperacion(opId) {
        const opIndex = this.operacionesPendientes.findIndex(op => op.id === opId);
        if (opIndex !== -1) {
            this.operacionesPendientes[opIndex].estado = 'completado';
            this.operacionesPendientes[opIndex].completedAt = new Date();
            return true;
        }
        return false;
    }
    
    fallarOperacion(opId) {
        const opIndex = this.operacionesPendientes.findIndex(op => op.id === opId);
        if (opIndex !== -1) {
            this.operacionesPendientes[opIndex].estado = 'fallido';
            this.enError = true;
            this.estado = 'error';
            this.visibleProperties.Estado = 'error';
            return true;
        }
        return false;
    }
    
    recuperarDeError() {
        if (this.enError) {
            this.enError = false;
            this.estado = 'conectado';
            this.visibleProperties.Estado = 'conectado';
            
            this.operacionesPendientes.forEach(op => {
                if (op.estado === 'fallido') {
                    op.estado = 'pendiente';
                    op.timestamp = new Date(); 
                }
            });
            
            return true;
        }
        return false;
    }
    
    expulsar() {
        this.estado = 'desconectado';
        this.visibleProperties.Estado = 'desconectado';
        this.enError = false;
    }
}

class USB extends Dispositivo {
    constructor(id) {
        super('usb', id);
        this.visibleProperties.Modelo = 'Genérico USB 3.0';
        this.visibleProperties.Capacidad = '32 GB';
        this.hiddenProperties.Velocidad = '5 Gbps';
        this.hiddenProperties['Tipo de controlador'] = 'UHCI';
    }
    
    leerDatos() {
        return this.operacionEntrada();
    }
    
    escribirDatos() {
        return this.operacionSalida();
        
    }
}

class Impresora extends Dispositivo {
    constructor(id) {
        super('impresora', id);
        this.visibleProperties.Modelo = 'Impresora Laser XYZ';
        this.visibleProperties['Tipo de tinta'] = 'Tóner';
        this.hiddenProperties.Resolución = '1200x1200 dpi';
        this.hiddenProperties['Memoria interna'] = '128 MB';
    }
    
    imprimir() {
        return this.operacionSalida();
    }
    
    estadoTinta() {
        return this.operacionEntrada();
    }
}

class Auriculares extends Dispositivo {
    constructor(id) {
        super('auriculares', id);
        this.visibleProperties.Modelo = 'Auriculares Stereo Pro';
        this.visibleProperties.Conectividad = 'Bluetooth';
        this.hiddenProperties['Frecuencia respuesta'] = '20Hz-20kHz';
        this.hiddenProperties['Nivel impedancia'] = '32 Ohm';
    }
    
    reproducirAudio() {
        return this.operacionSalida();
    }
    
    capturarAudio() {
        return this.operacionEntrada();
    }
}

class SimuladorSO {
    constructor() {
        this.dispositivos = [];
        this.colaOperaciones = [];
        this.manejadores = {
            'usb': {
                manejador: 'usb_handler.sys',
                operaciones: ['leerDatos', 'escribirDatos'],
                activos: 0
            },
            'impresora': {
                manejador: 'printer_handler.sys',
                operaciones: ['imprimir', 'estadoTinta'],
                activos: 0
            },
            'auriculares': {
                manejador: 'audio_handler.sys',
                operaciones: ['reproducirAudio', 'capturarAudio'],
                activos: 0
            }
        };
        this.nextId = 1;
        this.autoCompleteInterval = null;
        this.autoCompleteTime = 3000; 
    }
    
    conectarDispositivo(tipo) {
        let dispositivo;
        const id = `dev_${tipo}_${this.nextId++}`;
        
        switch(tipo) {
            case 'usb':
                dispositivo = new USB(id);
                break;
            case 'impresora':
                dispositivo = new Impresora(id);
                break;
            case 'auriculares':
                dispositivo = new Auriculares(id);
                break;
            default:
                return null;
        }
        
        this.dispositivos.push(dispositivo);
        this.manejadores[tipo].activos++;
        
        if (!this.autoCompleteInterval) {
            this.iniciarAutoCompletado();
        }
        
        this.actualizarVistas();
        return dispositivo;
    }
    
    iniciarAutoCompletado() {
        this.autoCompleteInterval = setInterval(() => {
            this.completarOperacionesPendientes();
        }, 1000); 
    }
    
    completarOperacionesPendientes() {
        const ahora = new Date();
        let operacionesCompletadas = 0;
        
        this.dispositivos.forEach(dispositivo => {
            if (dispositivo.estado !== 'conectado') return;
            
            dispositivo.operacionesPendientes.forEach(op => {
                if (op.estado === 'pendiente' && 
                    (ahora - op.timestamp) > this.autoCompleteTime) {
                    this.completarOperacion(op.id);
                    operacionesCompletadas++;
                }
            });
        });
        
        if (operacionesCompletadas > 0) {
            this.actualizarVistas();
        }
    }
    
    expulsarDispositivo(id) {
        const index = this.dispositivos.findIndex(dev => dev.id === id);
        if (index !== -1) {
            const tipo = this.dispositivos[index].tipo;
            this.dispositivos[index].expulsar();
            this.manejadores[tipo].activos--;
            
            this.dispositivos[index].operacionesPendientes.forEach(op => {
                if (op.estado === 'pendiente') {
                    op.estado = 'cancelado';
                    this.actualizarCola();
                }
            });
            
            if (this.dispositivos.filter(d => d.estado === 'conectado').length === 0) {
                clearInterval(this.autoCompleteInterval);
                this.autoCompleteInterval = null;
            }
            
            this.actualizarVistas();
            return true;
        }
        return false;
    }
    
    recuperarDispositivo(id) {
        const dispositivo = this.dispositivos.find(dev => dev.id === id);
        if (dispositivo && dispositivo.enError) {
            dispositivo.recuperarDeError();
            this.actualizarVistas();
            return true;
        }
        return false;
    }
    
    agregarOperacion(idDispositivo, tipoOperacion, datos) {
        const dispositivo = this.dispositivos.find(dev => dev.id === idDispositivo);
        if (!dispositivo || dispositivo.estado !== 'conectado') return null;
        
        let opId;
        switch(dispositivo.tipo) {
            case 'usb':
                opId = tipoOperacion === 'entrada' ? dispositivo.leerDatos() : dispositivo.escribirDatos();
                break;
            case 'impresora':
                opId = tipoOperacion === 'entrada' ? dispositivo.estadoTinta() : dispositivo.imprimir();
                break;
            case 'auriculares':
                opId = tipoOperacion === 'entrada' ? dispositivo.capturarAudio() : dispositivo.reproducirAudio();
                break;
        }
        
        this.colaOperaciones.push({
            id: opId,
            dispositivo: idDispositivo,
            tipo: tipoOperacion,
            estado: 'pendiente',
            timestamp: new Date()
        });
        
        this.actualizarVistas();
        return opId;
    }
    
    completarOperacion(opId) {
        const opIndex = this.colaOperaciones.findIndex(op => op.id === opId);
        if (opIndex === -1) return false;
        
        this.colaOperaciones[opIndex].estado = 'completado';
        this.colaOperaciones[opIndex].completedAt = new Date();
        
        const dispositivo = this.dispositivos.find(
            dev => dev.id === this.colaOperaciones[opIndex].dispositivo
        );
        
        if (dispositivo) {
            dispositivo.completarOperacion(opId);
        }
        
        return true;
    }
    
    fallarOperacion(opId) {
        const opIndex = this.colaOperaciones.findIndex(op => op.id === opId);
        if (opIndex === -1) return false;
        
        this.colaOperaciones[opIndex].estado = 'fallido';
        this.colaOperaciones[opIndex].failedAt = new Date();
        
        const dispositivo = this.dispositivos.find(
            dev => dev.id === this.colaOperaciones[opIndex].dispositivo
        );
        
        if (dispositivo) {
            dispositivo.fallarOperacion(opId);
        }
        
        return true;
    }
    
    actualizarVistas() {
        this.actualizarTablaControl();
        this.actualizarTablaManejadores();
        this.actualizarCola();
        this.actualizarAccionesDispositivos();
    }
    
    actualizarTablaControl() {
        const tbody = document.querySelector('#device-control-table tbody');
        tbody.innerHTML = '';
        
        this.dispositivos.forEach(dev => {
            const estadoClass = dev.enError ? 'status-error' : 
                              dev.estado === 'conectado' ? 'status-connected' : 'status-disconnected';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dev.id}</td>
                <td>${dev.tipo}</td>
                <td><span class="status-badge ${estadoClass}">${dev.estado}</span></td>
                <td>${dev.operacionesPendientes.filter(op => op.estado === 'pendiente').length}</td>
                <td>${dev.driver}</td>
                <td>
                    ${dev.enError ? 
                        `<button class="recover" onclick="simulador.recuperarDispositivo('${dev.id}')">Recuperar</button>` : 
                        `<button class="eject" onclick="simulador.expulsarDispositivo('${dev.id}')">Expulsar</button>`}
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    actualizarTablaManejadores() {
        const tbody = document.querySelector('#device-handlers-table tbody');
        tbody.innerHTML = '';
        
        for (const tipo in this.manejadores) {
            const manejador = this.manejadores[tipo];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tipo}</td>
                <td>${manejador.manejador}</td>
                <td>${manejador.operaciones.join(', ')}</td>
                <td>${manejador.activos}</td>
            `;
            tbody.appendChild(row);
        }
    }
    
    actualizarCola() {
        const queueDisplay = document.getElementById('queue-display');
        queueDisplay.innerHTML = '';
        
        //Solo muestra 10 operaciones
        const operacionesRecientes = [...this.colaOperaciones]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
        
        if (operacionesRecientes.length === 0) {
            queueDisplay.innerHTML = '<div class="queue-item">No hay operaciones en cola</div>';
            return;
        }
        
        operacionesRecientes.forEach(op => {
        const opElement = document.createElement('div');

        opElement.className = 'queue-item';
        if (op.estado === 'fallido') {
            opElement.classList.add('error');
        } else if (op.estado === 'completado') {
            opElement.classList.add('completed');
        }
        
        // Calcular tiempos
        let tiempo = '';
        if (op.estado === 'completado' && op.completedAt && op.timestamp) {
            const segundos = ((op.completedAt - op.timestamp) / 1000).toFixed(2);
            tiempo = ` (${segundos}s)`;
        } else if (op.estado === 'pendiente' && op.timestamp) {
            const segundosEspera = Math.floor((new Date() - op.timestamp) / 1000);
            tiempo = ` (espera: ${segundosEspera}s)`;
        }

            opElement.textContent = `${op.dispositivo || 'Desconocido'}: ${op.tipo || 'operación'} (${op.estado || 'sin estado'})${tiempo}`;
            
            queueDisplay.appendChild(opElement);
        });
    }
    
    actualizarAccionesDispositivos() {
        const deviceActions = document.getElementById('device-actions');
        deviceActions.innerHTML = '';
        
        this.dispositivos.filter(dev => dev.estado === 'conectado' || dev.enError).forEach(dev => {
            const devSection = document.createElement('div');
            devSection.className = 'device-info';
            
            const estadoClass = dev.enError ? 'status-error' : 'status-connected';
            devSection.innerHTML = `
                <h3>
                    ${dev.tipo.toUpperCase()} - ${dev.id} 
                    <span class="status-badge ${estadoClass}">${dev.enError ? 'ERROR' : 'CONECTADO'}</span>
                </h3>
            `;
            
            const propsList = document.createElement('ul');
            for (const key in dev.visibleProperties) {
                propsList.innerHTML += `<li><strong>${key}:</strong> ${dev.visibleProperties[key]}</li>`;
            }
            devSection.appendChild(propsList);
            
            // Mostrar Detalles del hardware
            const showHiddenBtn = document.createElement('button');
            showHiddenBtn.className = 'show-btn';
            showHiddenBtn.textContent = 'Detalles del hardware';
            showHiddenBtn.onclick = function() {
                const hiddenDiv = this.nextElementSibling;
                hiddenDiv.style.display = hiddenDiv.style.display === 'block' ? 'none' : 'block';
                this.textContent = hiddenDiv.style.display === 'block' ? 'Ocultar detalles del hardware' : 'Detalles de Hardware';
            };
            devSection.appendChild(showHiddenBtn);
            
            const hiddenDiv = document.createElement('div');
            hiddenDiv.className = 'hidden-info';
            const hiddenList = document.createElement('ul');
            for (const key in dev.hiddenProperties) {
                hiddenList.innerHTML += `<li><strong>${key}:</strong> ${dev.hiddenProperties[key]}</li>`;
            }
            hiddenDiv.appendChild(hiddenList);
            devSection.appendChild(hiddenDiv);
            
            // Botones de operaciones sin errores
            if (!dev.enError) {
                const opButtons = document.createElement('div');
                opButtons.style.marginTop = '10px';
                
                if (dev.tipo === 'usb') {
                    opButtons.innerHTML = `
                        <button onclick="simulador.agregarOperacion('${dev.id}', 'entrada')">Leer datos</button>
                        <button onclick="simulador.agregarOperacion('${dev.id}', 'salida')">Escribir datos</button>
                    `;
                } else if (dev.tipo === 'impresora') {
                    opButtons.innerHTML = `
                        <button onclick="simulador.agregarOperacion('${dev.id}', 'entrada')">Consultar estado tinta</button>
                        <button onclick="simulador.agregarOperacion('${dev.id}', 'salida')">Imprimir documento</button>
                    `;
                } else if (dev.tipo === 'auriculares') {
                    opButtons.innerHTML = `
                        <button onclick="simulador.agregarOperacion('${dev.id}', 'entrada')">Capturar audio</button>
                        <button onclick="simulador.agregarOperacion('${dev.id}', 'salida')">Reproducir audio</button>
                    `;
                }
                
                // Generar Error
                const errorBtn = document.createElement('button');
                errorBtn.className = 'error';
                errorBtn.textContent = 'Simular error';
                errorBtn.onclick = function() {
                    const dispositivo = simulador.dispositivos.find(d => d.id === dev.id);
                    if (dispositivo) {
                        const opPendiente = dispositivo.operacionesPendientes.find(op => op.estado === 'pendiente');
                        if (opPendiente) {
                            simulador.fallarOperacion(opPendiente.id);
                            alert(`Ocurrió un error en la operación ${opPendiente.id}`);
                            simulador.actualizarVistas();
                        } else {
                            alert('No hay operaciones pendientes para fallar');
                        }
                    }
                };
                opButtons.appendChild(errorBtn);
                
                devSection.appendChild(opButtons);
            } else {
                // El error
                const errorInfo = document.createElement('div');
                errorInfo.style.marginTop = '10px';
                errorInfo.style.color = '#e74c3c';
                errorInfo.innerHTML = '<strong>Dispositivo en estado de error. Algunas operaciones pueden haber fallado.</strong>';
                devSection.appendChild(errorInfo);
            }
            
            deviceActions.appendChild(devSection);
        });
    }
}

const simulador = new SimuladorSO();

// Event listeners para los botones de conexión
document.getElementById('connect-usb').addEventListener('click', () => {
    simulador.conectarDispositivo('usb');
});

document.getElementById('connect-printer').addEventListener('click', () => {
    simulador.conectarDispositivo('impresora');
});

document.getElementById('connect-headphones').addEventListener('click', () => {
    simulador.conectarDispositivo('auriculares');
});

simulador.actualizarVistas();