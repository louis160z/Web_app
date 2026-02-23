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
                url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
                dados = {"email": email, "password": senha}
                
                resposta_supabase = requests.post(url, json=dados, headers=headers)
                resultado = resposta_supabase.json()

                # A VERIFICAÇÃO DEFINITIVA: Olha o status da resposta (400 = Erro, 200 = Sucesso)
                if resposta_supabase.status_code != 200:
                    # Pega a mensagem ('msg') que o Supabase mandou, ou usa uma padrão se não vier
                    mensagem_erro = resultado.get("msg", "Ocorreu um erro, tente novamente ou solicite apoio técnico.")
                    if mensagem_erro == 'Invalid login credentials': mensagem_erro = "E-mail ou senha incorretos."
                    self.responder_json(200, {"sucesso": False, "mensagem": mensagem_erro})
                    return

                # Se passou do if acima, o status foi 200 OK. O token com certeza existe!
                self.responder_json(200, {
                    "sucesso": True, 
                    "access_token": resultado["access_token"],
                    "usuario": resultado["user"]
                })

        except Exception as e:
            self.responder_json(200, {"sucesso": False, "mensagem": f"Erro no servidor: {str(e)}"})

    # Função auxiliar para não repetir código
    def responder_json(self, status, dicionario):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(dicionario).encode())
