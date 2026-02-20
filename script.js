//----------------------------------------------------------------------------------------------------------
//                                          CONSTANTES E VARIÁVEIS GLOBAIS
//----------------------------------------------------------------------------------------------------------


const COR_PENDENTE = '#f59e0b';
const COR_PROCESSADO = '#3b82f6';
const COR_NEGADO = '#cf0a0a';
const COR_APROVADO = '#11f018';
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
async function postN8N(payload){
  let response;
    try{
        response = await fetch('/api/enviar_solicitacoes', {
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
    
    // Mostra o container do calendário
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
//                                            Funções de cadastro
//----------------------------------------------------------------------------------------------------------

//Função para login
async function fazerLogin() {
    const email_login = document.getElementById('email').value;
    const senha_login = document.getElementById('senha').value;

    if (!email_login || !senha_login) {
        alert("Por favor, preencha todos os campos.");
        return;
    }
    //Dados para mandar para o n8n
    const payload = {email: email_login, senha: senha_login, action: 'login'};
    
    try {
      resultado = await postN8N(payload); // Solicitando serviços ao N8N
    } catch(error) {
      return; //Apenas para não executar as próximas linhas de código
    }
    
    if(resultado.status === 'sucesso'){
        // currentUser declarado fora da função: let currentUser = null;
        currentUser = { role: resultado.role, nome: resultado.nome, email: resultado.email };
        listaGlobalReservas = resultado.array_calendar;
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('user-section').classList.remove('hidden');

        if (currentUser.role === 'manager') {
            document.getElementById('manager-section').classList.remove('hidden');
            carregarSolicitacoes();
        }
        //carregarDadosEAgenda();   
        inicializarAgenda(listaGlobalReservas);
    } else{
      alert("Credenciais inválidas");
    }
}

//----------------------------------------------------------------------------------------------------------

// Função para enviar o cadastro para o n8n
async function fazerCadastro() {
    //Checa se está na tela de registro de um manager
    const tela_reg_man = document.getElementById('register-section').classList.contains('hidden');
    let nome, senha, email, role, resultado;
    
    if(tela_reg_man) {
        const senha_admin = document.getElementById('manager-password').value;
        if(senha_admin != SENHA_ADMIN) { 
            alert('Insira a senha de admin correta!');
            return;
        }
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
    
    try {
      resultado = await postN8N(payload);
    } catch(error) {
      return; //Apenas para não executar as próximas linhas de código
    }
    
    alert("Cadastro realizado com sucesso! Agora você pode fazer login.");
    if (role === 'manager') alternarTelas('register-manager-section', 'login-section');
    if (role === 'user') alternarTelas('register-section', 'login-section');
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
      resultado = await postN8N(payload);
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
          resultado = await postN8N(payload); // Solicitando serviços ao N8N
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
          resultado = await postN8N(payload); // Solicitando serviços ao N8N
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
