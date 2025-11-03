from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.dashboard_routes import router as dashboard_router
from routes.sales_routes import router as sales_router
from routes.filtros_routes import router as filtros_router
from routes.produtos_routes import router as produtos_router
from routes.unidades_routes import router as unidades_router


app = FastAPI(
    title="Restaurant Analytics API",
    description="Backend para dashboards de performance de restaurantes",
    version="1.0.0"
)

# Habilitar CORS (para permitir o frontend acessar a API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar as rotas
app.include_router(dashboard_router)
app.include_router(sales_router)
app.include_router(filtros_router)
app.include_router(produtos_router)
app.include_router(unidades_router)

@app.get("/")
def root():
    return {"message": "API Online - Restaurant Analytics"}
