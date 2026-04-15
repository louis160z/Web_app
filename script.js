//----------------------------------------------------------------------------------------------------------
//                                          CONSTANTES E VARIÁVEIS GLOBAIS
//----------------------------------------------------------------------------------------------------------


const COR_PENDENTE = '#f59e0b';
const COR_PROCESSADO = '#3b82f6';
const COR_NEGADO = '#cf0a0a';
const COR_APROVADO = '#11f018';
const PATH_AUTENTICACAO = '/api/autenticar';
const PATH_SOLICITACOES = '/api/enviar_solicitacoes';
let currentUser = null;
let listaGlobalReservas = [];

//----------------------------------------------------------------------------------------------------------
//                                                FUNÇÕES
//----------------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------------
//                                            Funções auxiliares
//----------------------------------------------------------------------------------------------------------

//Função que transforma hexadecimal em uma das cores pré-definidas
function defineStatus(hexadecimal){
  switch(hexadecimal){
    case COR_PENDENTE: return 'Pendente'; break;
    case COR_APROVADO: return 'Aprovado'; break;
    case COR_NEGADO: return 'Negado'; break;
    default: return 'Indefinido'; break;
  }
}

//----------------------------------------------------------------------------------------------------------

//Função que transforma hexadecimal em uma fonte (há a possibilidade de mesclar com defineStatus())
function defineFonte(hexadecimal){
  switch(hexadecimal){
    case COR_PENDENTE: return 'font-bold text-orange-600'; break;
    case COR_APROVADO: return 'font-bold text-green-600'; break;
    case COR_NEGADO: return 'font-bold text-red-600'; break;
    default: return 'font-bold text-blue-600'; break;
  }
}

//----------------------------------------------------------------------------------------------------------

//Função apenas para transformar a data estilo YYYY-mm-DDThh:MM em DD/mm/YYYY, hh:MM
function formatarDataBR(dataISO) {
    if (!dataISO) return "Data inválida";
    return new Date(dataISO).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

//----------------------------------------------------------------------------------------------------------

//Função utilizada para atualizar o calendário de reservas, solicitações no painel do gestor e das reservas do usuario
function atualizarReservas(resultado) {
    const tela_minhas_reservas = document.getElementById('user-section').classList.contains('hidden');
    if(resultado) listaGlobalReservas.push(resultado);
    inicializarAgenda(listaGlobalReservas); //Atualiza agenda
    if(currentUser.role === 'manager') carregarSolicitacoes(); //Atualiza painel do gestor
    if (tela_minhas_reservas) carregarReservasUsuario(); //Atualiza minhas reservas do usuário
}

//----------------------------------------------------------------------------------------------------------

// Função genérica para trocar visibilidade entre duas seções
function alternarTelas(idSair, idEntrar) {
    document.getElementById(idSair).classList.add('hidden');
    document.getElementById(idEntrar).classList.remove('hidden');
}

//----------------------------------------------------------------------------------------------------------

// Função auxiliar de print para carregar os cards de minhas-reservas e painel-gestor
function stringBaseCard(pedido) {
          return `
          <div class="flex justify-between gap-2">
              <span class="font-bold text-gray-800">
                  ${pedido.nome} </span>
              <span class="text-[11px] text-gray-900 font-medium">
                  Pedido feito dia ${formatarDataBR(pedido.createdAt).split(',')[0]} </span>
            </div>
            <p class="text text-gray-600 mb-2">ID: #${pedido.id}</p>
            <p class="text-xs text-gray-600 mb-2">Atividade: ${pedido.atividade}</p>
            <p class="text-xs text-gray-600 mb-2">Solicitantes: ${pedido.solicitantes}</p>
            <p class="text-xs text-gray-600 mb-2">Coordenador responsável: ${pedido.coordenador}</p>
            <div class="text-[10px] text-gray-500 mb-3">
                <p>📅 Inicio:  ${formatarDataBR(pedido.start)}</p>
                <p>🏁 Fim:     ${formatarDataBR(pedido.end)}</p>
            </div>
            `
}

//----------------------------------------------------------------------------------------------------------
//                                            Funções de POST
//----------------------------------------------------------------------------------------------------------

//Função para solicitar serviço ao N8N, já criando mensagens de erros, sem precisar criá-las fora da função
async function enviarParaAPI(payload, path = PATH_SOLICITACOES){
  let response;
    try{
        response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        // Erro podendo ser de senha errada do Header Auth
        alert("Não foi possível conectar ao servidor do Munck. Verifique sua conexão.");
        throw new Error();
        return;
    }
    if (!response.ok) {
        alert("Erro no servidor (Status: " + response.status + ")");
        throw new Error();
        return;
    }
    return await response.json();
}

//----------------------------------------------------------------------------------------------------------
//                                    Funções de rederização/atualização
//----------------------------------------------------------------------------------------------------------

//Função para carregar agenda
function inicializarAgenda(reservas) {
    
    // Mostra o container do calendário (redundância)
    document.getElementById('calendar-container').classList.remove('hidden');

    const calendarEl = document.getElementById('calendario');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: ''
        },
        events: reservas,
        
        eventContent: function(arg) {
            const id = arg.event.id || "00";
            const titulo = arg.event.title;
            const corStatus = arg.event.backgroundColor;
            const atividade = arg.event.extendedProps.atividade;

            // Estrutura: [Bolinha] [ID] [Título]
            let arrayOfDomNodes = [
                document.createRange().createContextualFragment(
                    `<div class="flex items-center gap-1 overflow-hidden">
                        <span style="background-color: ${corStatus};" class="w-2 h-2 rounded-full flex-shrink-0"></span>
                        <b class="text-[10px] text-gray-700">#${id}</b>
                        <span class="truncate text-[10px]">${titulo}</span>
                    </div>`
                )
            ];
            
            return { domNodes: arrayOfDomNodes };
        },
        eventClick: function(info) {
            const idPedido = info.event.id || "Indefinido";
            const status = defineStatus(info.event.backgroundColor) || "Indefinido";
            const atividade = info.event.extendedProps.atividade || "Indefinido";
            const nome = info.event.extendedProps.nome || "Indefinido";
            const solicitantes = info.event.extendedProps.solicitantes || "Indefinido";
            const coordenador = info.event.extendedProps.coordenador || "Indefinido";

            alert(
                `              🆔 ID: #${idPedido}` +
                `\nUsuário: ${nome}` +
                `\nAtividade: ${atividade}` +
                `\nSolicitantes: ${solicitantes}` +
                `\nCoordenador responsável: ${coordenador}` +
                `\nStatus: ${status}` +
                `\n--------------------------------` +
                `\nInício: ${info.event.start.toLocaleString()}` +
                `\nFim: ${info.event.end.toLocaleString()}`
            );
        }
    });

    calendar.render();
}

//----------------------------------------------------------------------------------------------------------

//Função para carregar as reservas do usuário na sua aba de "minhas reservas"
async function carregarReservasUsuario() {
    //lista com cada div de pendência
    const listaContainer = document.getElementById('lista-reservas-usuario');
    
    //lista com cada pendência em formato json
    const listaUsuario = listaGlobalReservas.filter(item => {
            return item.email === currentUser.email;
        });

    // Limpa o container antes de carregar
    listaContainer.innerHTML = "";

    if (listaUsuario.length === 0) {
        listaContainer.innerHTML = "<p class='italic text-gray-400'>Nenhuma reserva realizada.</p>";
        return;
    }

    // Cria o HTML para cada pedido
    listaUsuario.forEach(pedido => {
        const card = document.createElement('div');
        card.className = "bg-gray-50 p-3 border rounded-md shadow-sm border-l-4 border-gray-800 mb-3";
        card.id = `card-pedido-${pedido.id}`; // ID único para remover depois

        card.innerHTML = `
          <div class="text-center gap-2">
            <span class="${defineFonte(pedido.color)}">
                STATUS: ${defineStatus(pedido.color)} </span>
          </div>
           ${stringBaseCard(pedido)}
            <div class="flex justify-end mt-2">
                <button onclick="deletarPedido(${pedido.id})" 
                    class="p-2 text-red-500 bg-red-50 rounded-md hover:bg-red-500 hover:text-white transition-all duration-200 shadow-sm"
                    title="Excluir solicitação">
                    🗑️
                </button>
            </div>
        `;
        listaContainer.appendChild(card);
    });
}

//----------------------------------------------------------------------------------------------------------

//Função de carregar o Painel do gestor
async function carregarSolicitacoes() {
    //lista com cada div de pendência
    const listaContainer = document.getElementById('lista-pendente');
    
    //lista com cada pendência em formato json
    const listaPendentes = listaGlobalReservas.filter(item => {
            return item.color === COR_PENDENTE;
        });
        

    // Limpa o container antes de carregar
    listaContainer.innerHTML = "";

    if (listaPendentes.length === 0) {
        listaContainer.innerHTML = "<p class='italic text-gray-400'>Nenhuma pendência no momento.</p>";
        return;
    }

    // Cria o HTML para cada pedido
    listaPendentes.forEach(pedido => {
        const card = document.createElement('div');
        card.className = "bg-gray-50 p-3 border rounded-md shadow-sm border-l-4 border-orange-400 mb-3";
        card.id = `card-pedido-${pedido.id}`; // ID único para remover depois

        card.innerHTML = `
           ${stringBaseCard(pedido)}
            <div class="flex gap-2">
                <button onclick="decidirPedido(${pedido.id}, 'aprovado')" 
                    class="flex-1 bg-green-500 text-white py-1 rounded text-xs hover:bg-green-600 transition">
                    ✅ Aprovar
                </button>
                <button onclick="decidirPedido(${pedido.id}, 'negado')" 
                    class="flex-1 bg-red-100 text-red-600 py-1 rounded text-xs hover:bg-red-200 transition">
                    ❌ Negar
                </button>
            </div>
        `;
        listaContainer.appendChild(card);
    });
}
//----------------------------------------------------------------------------------------------------------

//Função que evita problemas de segurança, mostrando HTML de tela de minhas reservas apenas APÓS o login
function mostrarManagerSection() {
  const managerSection = document.getElementById('manager-section');
  managerSection.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg border-t-4 border-red-500">
        <h2 class="font-bold text-red-600 mb-4 text-lg flex items-center gap-2">
            <span>🛡️</span> Painel do Gestor
        </h2>
        <div id="lista-pendente" class="text-sm text-gray-600 space-y-2">
            <p class="italic">Carregando solicitações...</p>
        </div>
  `;
} 

//----------------------------------------------------------------------------------------------------------

//Função que evita problemas de segurança, mostrando HTML de tela de calendario apenas APÓS o login
function mostrarCalendarContainer() {
  const calendarContainer = document.getElementById('calendar-container');
  calendarContainer.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-xl font-bold mb-4 text-gray-700 flex items-center gap-2">
            <span>📅</span> Agenda de Reservas
        </h2>
        <div id="calendario"></div>
    </div>
  `;
}  

//----------------------------------------------------------------------------------------------------------

//Função que evita problemas de segurança, mostrando HTML de tela de minhas reservas apenas APÓS o login
function mostrarMinhasReservasSection() {
  const minhasReservasSection = document.getElementById('minhas-reservas-section');
  minhasReservasSection.innerHTML = `
    <h2 class="text-lg flex justify-between items-center font-bold mb-4 text-blue-600 border-b pb-2">
        Minhas reservas
        <button onclick="alternarTelas('minhas-reservas-section','user-section')" 
            class="text-[10px] border border-blue-600 text-blue-600 px-3 py-1 rounded-full font-medium hover:bg-blue-50 transition">
            Nova reserva
        </button>
    </h2>
    
    <div id="lista-reservas-usuario" class="text-sm text-gray-600 space-y-2">
        <p class="italic">Carregando solicitações...</p>
    </div>
  `;
  
}  

//----------------------------------------------------------------------------------------------------------

//Função que evita problemas de segurança, mostrando HTML de tela do usuário apenas APÓS o login
function mostrarUserSection() {
    const userSection = document.getElementById('user-section');
    userSection.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-center mb-8 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
            <div class="flex gap-3 w-full sm:w-auto">
                <button onclick="atualizarReservas()" class="flex-1 sm:flex-none bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-1.5 px-4 text-sm rounded transition">
                    🔄 Atualizar
                </button>
            
                <button onclick="fazerLogout()" class="flex-1 sm:flex-none bg-white border border-red-500 text-red-500 hover:bg-red-50 font-semibold py-1.5 px-4 text-sm rounded transition">
                    🚪 Sair
                </button>
            </div>
        </div>
        
        <h2 class="text-lg flex justify-between items-center font-bold mb-4 text-blue-600 border-b pb-2">
            Nova Reserva
            <button onclick="alternarTelas('user-section','minhas-reservas-section'); carregarReservasUsuario()" 
                class="text-[10px] border border-blue-600 text-blue-600 px-3 py-1 rounded-full font-medium hover:bg-blue-50 transition">
                Minhas reservas
            </button>
        </h2>
        <h2 class="font-semibold mb-1 text-gray-500 text-xs uppercase">COORDENADOR</h2>
        <select id="coordenador" class="w-full mb-2 p-2 border rounded text-sm text-gray-800">
            <option value="" disabled selected hidden>Coordenador responsável</option>
            <option value="Gabriel Santos Meyer">Gabriel Santos Meyer</option>
            <option value="Rogério Santos de Oliveira">Rogério Santos de Oliveira</option>
        </select>
  
        <h2 class="font-semibold mb-1 text-gray-500 text-xs uppercase">Solicitantes</h2>
        <input type="text" id="solicitantes" placeholder="Pessoa 1/Pessoa 2" class="w-full mb-3 p-2 border rounded text-sm">
        
        <h2 class="font-semibold mb-1 text-gray-500 text-xs uppercase">Atividade</h2>
        <textarea id="atividade" placeholder="Detalhamento da atividade..." rows="3" class="w-full mb-3 p-2 border rounded text-sm"></textarea>
        
        <h2 class="font-semibold mb-1 text-gray-500 text-xs uppercase">Data inicial</h2>
        <input type="datetime-local" id="reserva-inicial" class="w-full mb-3 p-2 border rounded text-sm">
        
        <h2 class="font-semibold mb-1 text-gray-500 text-xs uppercase">Data final</h2>
        <input type="datetime-local" id="reserva-final" class="w-full mb-4 p-2 border rounded text-sm">
        
        <button onclick="solicitarAgendamento()" class="w-full bg-green-500 text-white p-2 rounded font-bold hover:bg-green-600 transition">Solicitar Reserva</button>
    `;
}

//----------------------------------------------------------------------------------------------------------

//Função para mostrar a tela inicial

function mostrarTelaInicial() {
    mostrarUserSection();
    mostrarCalendarContainer();
    mostrarMinhasReservasSection();

    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('register-manager-section').classList.add('hidden');
    document.getElementById('user-section').classList.remove('hidden');
    document.getElementById('calendar-container').classList.remove('hidden');


    if (currentUser.role === 'manager') {
        mostrarManagerSection();
        document.getElementById('manager-section').classList.remove('hidden');
        carregarSolicitacoes();
    } 
}

//----------------------------------------------------------------------------------------------------------
//                                            Funções de cadastro
//----------------------------------------------------------------------------------------------------------

//Função para login
async function fazerLogin() {
    let resultado_auth, resultado_n8n; //varivel para armazenar o resultado retornado pela API de auth
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    const btnLogin = document.getElementById('btn-login');
    const textoOriginal = btnLogin.innerText; // Salva a palavra "Entrar"

    if (!email || !senha) {
        alert("Preencha todos os campos.");
        return;
    }

    //Trava o botão e muda o visual
    btnLogin.disabled = true; 
    btnLogin.classList.add('opacity-50', 'cursor-not-allowed'); 
    btnLogin.innerText = "Aguarde..."; // Dá o feedback para o usuário

    const payload_auth = { action: 'login', email: email, senha: senha };
    const payload_n8n = {action: 'carregar_dados', email: email};
    
    try {
        resultado_auth = await enviarParaAPI(payload_auth, PATH_AUTENTICACAO);

        if (resultado_auth.sucesso === false) {
            // Mostra o erro traduzido que o Supabase enviou
            alert(resultado_auth.mensagem);
            return;
        }
    } catch(error) {
        return; //Apenas para não realizar as linhas abaixo
    } finally {
        //Destrava o botão
        //Isso roda obrigatoriamente no final, dando erro ou sucesso
        btnLogin.disabled = false; 
        btnLogin.classList.remove('opacity-50', 'cursor-not-allowed'); 
        btnLogin.innerText = textoOriginal; // Devolve a palavra "Entrar 
    }

    // SALVANDO A CHAVE MESTRA DO USUÁRIO NO NAVEGADOR
    localStorage.setItem('munck_token', resultado_auth.access_token);
    localStorage.setItem('munck_user_id', resultado_auth.usuario.id);

    currentUser = { 
      role: resultado_auth.usuario.user_metadata.role, 
      nome: resultado_auth.usuario.user_metadata.nome, 
      email: email
    };

    mostrarTelaInicial(); //Mostra a tela inicial, por enquanto sem agenda carregada

    try {
      resultado_n8n = await enviarParaAPI(payload_n8n);
    } catch(error) {
      return; //Apenas para não realizar as linhas abaixo
    }
 
    listaGlobalReservas = resultado_n8n.array_calendar;
    atualizarReservas();
}

//----------------------------------------------------------------------------------------------------------

//Função para logout
function fazerLogout() {
    // 1. Destrói as chaves de acesso no navegador (Segurança em 1º lugar)
    localStorage.removeItem('munck_token');
    localStorage.removeItem('munck_user_id');

    // 2. Limpa a memória temporária do sistema
    currentUser = null;
    listaGlobalReservas = [];

    // 3. Troca as telas: Esconde as áreas restritas e mostra o login
    document.getElementById('user-section').classList.add('hidden');
    document.getElementById('manager-section').classList.add('hidden'); // Garante que o painel do gestor também feche
    document.getElementById('calendar-container').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');

    document.getElementById('user-section').innerHTML = ``;
    document.getElementById('manager-section').innerHTML = ``;
    document.getElementById('calendar-container').innerHTML = ``;
    document.getElementById('minhas-reservas-section').innerHTML = ``;

    // 4. (Opcional, mas recomendado) Limpa os campos de senha digitados anteriormente
    document.getElementById('login-email').value = '';
    document.getElementById('login-senha').value = '';
}

//----------------------------------------------------------------------------------------------------------

// Função para enviar o cadastro para o n8n
async function fazerCadastro() {
    //Checa se está na tela de registro de um manager
    const tela_reg_man = !document.getElementById('register-manager-section').classList.contains('hidden');
    let nome, senha, email, role, resultado, senha_admin;
  
    if(tela_reg_man) {
        senha_admin = document.getElementById('manager-password').value;
        nome = document.getElementById('reg-man-nome').value;
        email = document.getElementById('reg-man-email').value;
        senha = document.getElementById('reg-man-senha').value;
        role = 'manager';
    }
    else {
        nome = document.getElementById('reg-nome').value;
        email = document.getElementById('reg-email').value;
        senha = document.getElementById('reg-senha').value;
        role = 'user';
    }
    if (!nome || !email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const payload = {
        action: 'cadastro',
        nome: nome,
        email: email,
        role: role,
        senha: senha // Trocar para HTTPS posteriormente para segurança
    };
  
    if(tela_reg_man) payload.senha_digitada = senha_admin; //Adiciona a senha digitada pelo usuario ao payload
    
    try {
      resultado = await enviarParaAPI(payload, PATH_AUTENTICACAO);
    } catch(error) {
      return; //Apenas para não executar as próximas linhas de código
    }
    
    
    switch(resultado.sucesso){
      case true:
            alert(resultado.mensagem);
            if (role === 'manager') alternarTelas('register-manager-section', 'login-section');
            if (role === 'user') alternarTelas('register-section', 'login-section');
            break;
      case false:
            alert(resultado.mensagem);
            break;
      default:
            alert(resultado.mensagem || "Houve um erro inesperado, tente novamente.");
            break;
    }
}

//----------------------------------------------------------------------------------------------------------
//                                        Funções de solicitações/decisões
//----------------------------------------------------------------------------------------------------------

//Função para enviar o agendamento para a tabela N8N com as informações inseridas, mantendo-a como pendente
async function solicitarAgendamento() {
    let resultado;
    const inicio = document.getElementById('reserva-inicial').value;
    const fim = document.getElementById('reserva-final').value;
    const atividade = document.getElementById('atividade').value;
    const solicitantes = document.getElementById('solicitantes').value;
    const coordenador = document.getElementById('coordenador').value;

    const payload = {
        action: 'agendamento',
        nome: currentUser.nome,
        data_inicio: inicio,
        data_fim: fim,
        atividade: atividade,
        solicitantes: solicitantes,
        coordenador: coordenador,
        email: currentUser.email
    };
    
    if(!atividade || !inicio || !fim || !solicitantes || !coordenador){
      alert("Por favor, preencha todos os campos.");
      return;
    }
    
    try {
      resultado = await enviarParaAPI(payload);
    } catch(error) {
      return; //Apenas para não executar as próximas linhas de código
    }
    
    //Atualizando lista e renderizando novamente calendario
    atualizarReservas(resultado);
    alert(`Solicitação enviada!\n ID da solicitação:  ${resultado.id}`);
}

//----------------------------------------------------------------------------------------------------------

//Deve ter alguma notificação para pedir para deletar ou cancelar o pedido ************
//Função para deletar pedido na aba "minhas reservas"
async function deletarPedido(idPedido){
    const mensagem = `Deseja deletar o pedido de ID: ${idPedido}? 
                      \n Essa ação não poderá ser desfeita`;

    if(confirm(mensagem)){
        let resultado;
        const payload = {action: 'deletar_pedido', id: idPedido};
        
        try {
          resultado = await enviarParaAPI(payload); // Solicitando serviços ao N8N
        } catch(error) {
          return; //Apenas para não executar as próximas linhas de código
        }
        
        // Simulação visual: Remove o card da tela com um efeito simples
        const card = document.getElementById(`card-pedido-${idPedido}`);
        card.classList.add('opacity-50', 'pointer-events-none');
        
        setTimeout(() => {
            card.remove();
            alert(`Solicitação ${idPedido} deletada`);
            
            // Se não sobrar nenhum card, mostra a mensagem de vazio
            const lista = document.getElementById('lista-reservas-usuario');
            if (lista.children.length === 0) {
                lista.innerHTML = "<p class='italic text-gray-400'>Nenhuma reserva realizada.</p>";
            }
        }, 500);

        const listaAtualizada = listaGlobalReservas.filter(reserva => {
            return reserva.id !== idPedido;
        });
        listaGlobalReservas = listaAtualizada;
        atualizarReservas();
    }

}

//----------------------------------------------------------------------------------------------------------

//Função para decidir pedido no painel do gestor, considerando o botão de aprovar ou negar
async function decidirPedido(idPedido, acao) {
    const mensagem = `Deseja que o pedido de ID ${idPedido} seja ${acao}?
                      \n Essa ação não poderá ser desfeita`;
                      
    if(confirm(mensagem)){
        let resultado;
        const payload = { action: 'decisao_gestor', id: idPedido, status: acao };
        
        try {
          resultado = await enviarParaAPI(payload); // Solicitando serviços ao N8N
        } catch(error) {
          return; //Apenas para não executar as próximas linhas de código
        }
        
        console.log(`Pedido ${idPedido} foi ${acao}`);
        
        // Simulação visual: Remove o card da tela com um efeito simples
        const card = document.getElementById(`card-pedido-${idPedido}`);
        card.classList.add('opacity-50', 'pointer-events-none');
        
        setTimeout(() => {
            card.remove();
            alert(`Solicitação ${idPedido} marcada como: ${acao.toUpperCase()}`);
            
            // Se não sobrar nenhum card, mostra a mensagem de vazio
            const lista = document.getElementById('lista-pendente');
            if (lista.children.length === 0) {
                lista.innerHTML = "<p class='italic text-gray-400'>Nenhuma pendência no momento.</p>";
            }
        }, 500);
        
        //Retirando o pedido da lista global
        const listaAtualizada = listaGlobalReservas.filter(reserva => {
            return reserva.id !== idPedido;
        });
        listaGlobalReservas = listaAtualizada;
        
        //Atualizando a lista global com novo pedido aprovado
        atualizarReservas(resultado);
    }
}
