# 🍔 GodLevel Dashboard

Dashboard analítico para restaurantes, desenvolvido com **FastAPI (Python)** no backend e **React + Chart.js** no frontend.  
O sistema exibe indicadores de desempenho (KPIs), faturamento diário e produtos mais vendidos, com dados simulados.

---

## 🚀 Pré-requisitos

Antes de rodar o projeto, garanta que as seguintes dependências estejam instaladas na sua máquina:

### 🐍 Backend
- [Python 3.10+](https://www.python.org/downloads/)
- [Uvicorn](https://www.uvicorn.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic](https://docs.pydantic.dev/)
- [Docker](https://www.docker.com/) (para inicialização do ambiente e base de dados, conforme o Quickstart)

### 💻 Frontend
- [Node.js 18+](https://nodejs.org/)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [React](https://react.dev/)
- [Chart.js](https://www.chartjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## ⚙️ Inicialização do Projeto

### 1️⃣ Clonar o repositório
```bash
git clone https://github.com/seu-usuario/GodLevel.git
cd GodLevel
```

---

### 2️⃣ Inicializar os dados e containers (Docker)
Siga as instruções do **Quickstart** para subir o ambiente e a base de dados com Docker.

---

### 3️⃣ Rodar o Backend (FastAPI)
Acesse a pasta do backend:
```bash
cd backend
```

Instale as dependências do Backend:
```bash
pip install fastapi
pip install uvicorn
pip install pydantic
pip install pandas
pip install python-dotenv
```

Execute o servidor:
```bash
uvicorn main:app --reload
```

O backend estará disponível em:
👉 http://127.0.0.1:8000

---

### 4️⃣ Rodar o Frontend (React)
Acesse a pasta do frontend:
```bash
cd ../frontend
```

Instale as dependências:
```bash
npm install react
npm install react-dom
npm install chart.js
npm install tailwindcss


npm install vite --save-dev
npm install typescript --save-dev

```

Execute o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em:
👉 http://localhost:5173 (ou a porta exibida no terminal)

---

## 🧩 Estrutura do Projeto

```
GodLevel/
├── backend/          # API FastAPI
│   ├── main.py
│   ├── connection.py
│   ├── services/
│   ├── routes/
│   └── ...
│
├── frontend/         # Aplicação React + Chart.js
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── docker-compose.yml  # Configuração de ambiente
└──...

```

---

## 💡 Observação

Este projeto faz parte de um desafio técnico.  
Continuarei desenvolvendo novas features e aprimorando o dashboard.

---

## 🧠 Autor

**Lucas Pessoa**  
📧 [contato.lucaspessoaoliveira@gmail.com]  
🔗 [github.com/lucaspvc](https://github.com/lucaspvc)

---
