# /api/enviar_solicitacoes.py
from http.server import BaseHTTPRequestHandler
import os
import requests
import json
import urllib.request
from urllib.error import HTTPError


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Dados do site
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data)

        #Chaves do Vercel internas a classe
        N8N_URL = os.environ.get('N8N_WEBHOOK_URL')
        N8N_AUTH = os.environ.get('N8N_HEADER_AUTH')

        # Exige token de login para fazer solicitacao
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.responder_json(200, {"sucesso": False, "mensagem": "Acesso negado: Token não fornecido. Caso o erro persista contate o suporte técnico."})
            return
        
        # Recupera o token e evita caracteres não desejados
        token = auth_header.split(' ')[1].replace('"', '').replace("'", "").strip()
        
        #Chaves Vercel
        SUPABASE_URL = os.environ.get('SUPABASE_URL')
        SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
        
        try:
            # Pergunta ao Supabase se o token é válido
            req = urllib.request.Request(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY
                }
            )
            #Apenas verifica retorno 200 do supabase, c.c gera exceção
            with urllib.request.urlopen(req) as response:
                #dados_usuario = json.loads(response.read().decode())
                pass

            # Faz o envio sem aparecer no F12 (inspect)
            resultado_n8n = requests.post(
                N8N_URL, 
                json=payload, 
                headers={'web_authentication': N8N_AUTH}
            )

            # Resposta OK para o site
            resposta = resultado_n8n.json()
            resposta["sucesso"] = True
            self.responder_json(200, resposta)

        except jwt.ExpiredSignatureError as e:
            self.responder_json(200, {
                "sucesso": False,
                "mensagem": "Acesso Negado: O Token expirou. Caso o erro persista contate o suporte técnico."
            })
            
        except jwt.InvalidTokenError as e:
            self.responder_json(200, {
                "sucesso": False,
                "mensagem": "Acesso Negado: Token inválido ou corrompido. Caso o erro persista contate o suporte técnico."
            })
        except Exception as e:
            self.responder_json(200, {"sucesso": False, "mensagem": f"Erro no servidor: {str(e)}"})
    
    def responder_json(self, status, dicionario):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(dicionario).encode())
