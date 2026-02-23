# api/autenticar.py
from http.server import BaseHTTPRequestHandler
import os
import requests
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        payload = json.loads(body)

        # Pega as chaves do cofre da Vercel
        SUPABASE_URL = os.environ.get('SUPABASE_URL')
        SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

        acao = payload.get('action')
        email = payload.get('email')
        senha = payload.get('senha')

        # Cabeçalhos obrigatórios que o Supabase exige
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }

        try:
            if acao == 'login':
                # Bate na porta de LOGIN do Supabase
                url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
                dados = {"email": email, "password": senha}
                
                resposta_supabase = requests.post(url, json=dados, headers=headers)
                resultado = resposta_supabase.json()

                # O Supabase retorna "error" se a senha estiver errada
                if "error" in resultado:
                    self.responder_json(200, {"sucesso": False, "mensagem": resultado.get("error_description", "Credenciais inválidas.")})
                    return

                # Se deu certo, devolvemos o Token de Acesso para o JS
                self.responder_json(200, {
                    "sucesso": True, 
                    "access_token": resultado["access_token"],
                    "usuario": resultado["user"]
                })

        except Exception as e:
            # Isso vai mandar o erro técnico exato do Python para o pop-up do site
            self.responder_json(200, {"sucesso": False, "mensagem": f"Erro técnico: {str(e)}"})

    # Função auxiliar para não repetir código
    def responder_json(self, status, dicionario):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(dicionario).encode())
