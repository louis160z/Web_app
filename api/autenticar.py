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
        SENHA_ADMIN_REAL = os.environ.get('SENHA_ADMIN')

        acao = payload.get('action')
        email = payload.get('email')
        senha = payload.get('senha')

        # Cabeçalhos obrigatórios que o Supabase exige
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }

        try:
            # ==========================================
            # ROTA DE LOGIN
            # ==========================================
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



            # ==========================================
            # ROTA DE CADASTRO
            # ==========================================
            elif acao == 'cadastro':
                nome = payload.get('nome')
                role = payload.get('role')

                if role == 'manager':
                    senha_digitada = payload.get('senha_digitada')
                    if senha_digitada != SENHA_ADMIN_REAL:
                        self.responder_json(200, {"sucesso": False, "mensagem": "Senha de admin incorreta!"})
                        return

                url = f"{SUPABASE_URL}/auth/v1/signup"
                
                # O Supabase tem um campo 'data' feito para guardar dados especificos de cada usuario
                dados = {
                    "email": email, 
                    "password": senha,
                    "data": {
                        "nome": nome,
                        "role": role
                    }
                }
                
                resposta_supabase = requests.post(url, json=dados, headers=headers)
                resultado = resposta_supabase.json()

                # Se o e-mail já existir ou a senha for fraca, o Supabase avisa aqui (Status 400 ou 422)
                if resposta_supabase.status_code != 200:
                    mensagem_erro = resultado.get("msg", "Erro ao realizar o cadastro.")
                    self.responder_json(200, {"sucesso": False, "mensagem": mensagem_erro})
                    return

                self.responder_json(200, {"sucesso": True, "mensagem": "Cadastro realizado com sucesso!"})
                
        except Exception as e:
            self.responder_json(200, {"sucesso": False, "mensagem": f"Erro no servidor: {str(e)}"})

    # Função auxiliar para não repetir código
    def responder_json(self, status, dicionario):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(dicionario).encode())
