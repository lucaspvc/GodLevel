import psycopg2
import os
from dotenv import load_dotenv
from psycopg2 import Error

load_dotenv()

password = os.getenv('password')

def conecta():
    try:
        conn = psycopg2.connect(
            host=os.getenv('host'),
            port=os.getenv('port'),
            database=os.getenv('database'),
            user=os.getenv('user'),
            password=os.getenv('password')
        )
        print("Conectado com sucesso!")
        return conn
    
    except Error as e:
        print(f"Erro ao conectar com o banco de dados! {e}")

def encerra_conexao(conn):
    if conn:
        conn.close()
    print("Conexão encerrada")