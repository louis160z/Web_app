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
