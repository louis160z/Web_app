# Web App de agendamentos
Aplicativo com o intuito de fornecer a possibilidade de agendar um caminhão "Munck" de transporte de cargas por outras pessoas, considerando gerentes que são capazes
de aprovar ou negar uma solicitação enviada por um usuário comum. Nesse sentido, o site possui uma comunicação com o N8N para comunicação com banco de dados e possivelmente
para o envio de e-mails. Desse modo, a interface do site conta com uma autenticação simples utilizando o Supabase para aumentar a segurança de dados.

Na seção do usuário, após o login, é possível realizar ações de solicitar agendamento, apagar agendamento solicitado, negar ou aceitar agendamento (apenas caso seja um gerente), listar próprios agendamentos e, além disso, é possível a visualização de todos os agendamentos em um calendário no centro da página, facilitando a visualização das datas de agendamentos de outros usuários. Nesse calendário, é possível clicar no agendamento e verificar qual o ID do agendamento, quem agendou e motivos mais específicos.

Por fim, a realização da postagem do site foi realizada por meio do Vercel, também responsável por conter as variáveis de ambiente com segurança para que elas não fiquem no frontend do javascript. Além disso, o Vercel é o responsável por rodar o código presente no github, permitindo uma integração entre o Frontend e backend, criando um Fullstack simples.

Para o funcionamento do N8N, foi utilizado o servidor da Oracle Cloud Free Tier, o qual permitiu a criação de um container Docker para suportar um servidor 24h rodando o N8N, permitindo assim a solicitação de serviços.
