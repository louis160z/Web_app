# api/autenticar.py
from http.server import BaseHTTPRequestHandler
import os
import requests
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Recebe o e-mail e a senha digitados no Frontend
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        payload = json.loads(body)

        # 2. Pega as variáveis de ambiente seguras na Vercel
        N8N_LOGIN_URL = os.environ.get('N8N_WEBHOOK_LOGIN_URL') 
        N8N_AUTH = os.environ.get('N8N_HEADER_AUTH')

        try:
            # 3. Encaminha o pacote (com a senha) para o n8n
            response = requests.post(
                N8N_LOGIN_URL, 
                json=payload, 
                headers={'web_authentication': N8N_AUTH}
            )

            # 4. Devolve a resposta do n8n (o token de acesso ou o erro do Supabase)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response.json()).encode())

        except Exception as e:
            # Proteção caso o n8n esteja fora do ar
            self.send_response(200) # Soft error para o JS tratar
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            erro = {"sucesso": False, "mensagem": "Servidor de autenticação indisponível."}
            self.wfile.write(json.dumps(erro).encode())
