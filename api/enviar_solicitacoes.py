# /api/enviar_solicitacoes.py
from http.server import BaseHTTPRequestHandler
import os
import requests
import json
import jwt

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Dados do site
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data)

        # Chaves do Vercel
        N8N_URL = os.environ.get('N8N_WEBHOOK_URL')
        N8N_AUTH = os.environ.get('N8N_HEADER_AUTH')

        #Exige token de login para fazer solicitacao
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.responder_json(401, {"sucesso": False, "mensagem": "Acesso negado: Token não fornecido."})
            return
        token = auth_header.split(' ')[1]
        # Senha mestra do Supabase salva no Vercel
        JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET')

        try:
            # Tenta decodificar o token, considerando que Supabase usa HS256
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
            # Faz o envio sem aparecer no F12 (inspect)
            response = requests.post(
                N8N_URL, 
                json=payload, 
                headers={'web_authentication': N8N_AUTH}
            )
            # Resposta OK para o site
            self.responder_json(200, response.json())

        except jwt.ExpiredSignatureError:
            self.responder_json(401, {
                "sucesso": False,
                "mensagem": "Acesso Negado: O Token expirou. Caso o erro persista contate o suporte técnico."
            })
            
        except jwt.InvalidTokenError:
            self.responder_json(401, {
                "sucesso": False,
                "mensagem": "Acesso Negado: Token inválido ou corrompido. Caso o erro persista contate o suporte técnico."
            })
    
    def responder_json(self, status, dicionario):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(dicionario).encode())
