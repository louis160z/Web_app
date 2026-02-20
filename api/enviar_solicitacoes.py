# /api/enviar_solicitacoes.py
from http.server import BaseHTTPRequestHandler
import os
import requests
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Pega os dados vindos do seu site
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data)

        # 2. Pega as chaves que estão escondidas no painel da Vercel
        N8N_URL = os.environ.get('N8N_WEBHOOK_URL')
        N8N_AUTH = os.environ.get('N8N_HEADER_AUTH')
        SENHA_ADMIN_REAL = os.environ.get('SENHA_ADMIN')

        if payload.get('role') == 'manager':
            senha_digitada = payload.get('senha_digitada')
            
            if senha_digitada != SENHA_ADMIN_REAL:
                # manda status 200 apesar de poder mandar 401 de senha errada para que o código continue para o .js e seja tratado lá
                self.send_response(200) 
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                # Mas enviamos um JSON avisando que a regra de negócio falhou
                resposta_erro = {"sucesso": False}
                self.wfile.write(json.dumps(resposta_erro).encode())
                return # Impede o envio para o n8n
        
        # 3. Faz o envio real (O usuário não vê isso acontecendo)
        response = requests.post(
            N8N_URL, 
            json=payload, 
            headers={'web_authentication': N8N_AUTH}
        )

        # 4. Devolve a resposta para o seu site
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response.json()).encode())
