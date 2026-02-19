import { drizzle } from "drizzle-orm/mysql2";
import { 
  suppliers, jobFunctions, events, collaborators, accreditations, eventFunctionLimits
} from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    // 1. Criar fornecedores
    console.log("Criando fornecedores...");
    const supplier1Result = await db.insert(suppliers).values({
      name: "Globo Comunicações",
      contactName: "Maria Silva",
      contactEmail: "maria@globo.com",
      contactPhone: "21987654321",
      active: true,
    });
    const supplier1Id = Number(supplier1Result[0].insertId);
    
    const supplier2Result = await db.insert(suppliers).values({
      name: "SporTV Produções",
      contactName: "João Santos",
      contactEmail: "joao@sportv.com",
      contactPhone: "21987654322",
      active: true,
    });
    const supplier2Id = Number(supplier2Result[0].insertId);

    const supplier3Result = await db.insert(suppliers).values({
      name: "ESPN Brasil",
      contactName: "Ana Costa",
      contactEmail: "ana@espn.com.br",
      contactPhone: "11987654323",
      active: true,
    });
    const supplier3Id = Number(supplier3Result[0].insertId);

    // 2. Criar funções
    console.log("Criando funções...");
    const funcoes = [
      { name: "Câmera", description: "Operador de câmera" },
      { name: "Repórter", description: "Repórter de campo" },
      { name: "Produtor", description: "Produtor de conteúdo" },
      { name: "Editor", description: "Editor de vídeo" },
      { name: "Técnico de Som", description: "Técnico de áudio" },
      { name: "Motorista", description: "Motorista de equipe" },
      { name: "Segurança", description: "Segurança da equipe" },
      { name: "Coordenador", description: "Coordenador de operações" },
    ];

    for (const func of funcoes) {
      await db.insert(jobFunctions).values({ ...func, active: true });
    }

    // 3. Criar eventos
    console.log("Criando eventos...");
    const hoje = new Date();
    const d10 = new Date(hoje);
    d10.setDate(hoje.getDate() + 10);
    const d4 = new Date(hoje);
    d4.setDate(hoje.getDate() + 4);
    const d3 = new Date(hoje);
    d3.setDate(hoje.getDate() + 3);

    const event1Result = await db.insert(events).values({
      name: "Campeonato Brasileiro - Flamengo x Palmeiras",
      wo: "WO2026001",
      eventDate: d10.toISOString().split('T')[0],
      registrationDeadline: d4.toISOString().split('T')[0],
      credentialReleaseDate: d3.toISOString().split('T')[0],
      location: "Maracanã - Rio de Janeiro",
      eventType: "Futebol",
      federation: "CBF",
      status: "aberto",
      notes: "Jogo decisivo do campeonato",
      active: true,
      createdBy: 1,
    });
    const event1Id = Number(event1Result[0].insertId);

    const d20 = new Date(hoje);
    d20.setDate(hoje.getDate() + 20);
    const d14 = new Date(hoje);
    d14.setDate(hoje.getDate() + 14);
    const d13 = new Date(hoje);
    d13.setDate(hoje.getDate() + 13);

    const event2Result = await db.insert(events).values({
      name: "Copa Libertadores - Final",
      wo: "WO2026002",
      eventDate: d20.toISOString().split('T')[0],
      registrationDeadline: d14.toISOString().split('T')[0],
      credentialReleaseDate: d13.toISOString().split('T')[0],
      location: "Monumental de Núñez - Buenos Aires",
      eventType: "Futebol",
      federation: "CONMEBOL",
      status: "aberto",
      notes: "Final da Libertadores 2026",
      active: true,
      createdBy: 1,
    });
    const event2Id = Number(event2Result[0].insertId);

    // 4. Criar colaboradores
    console.log("Criando colaboradores...");
    const colaboradores = [
      {
        supplierId: supplier1Id,
        name: "Carlos Eduardo Silva",
        cpf: "12345678901",
        email: "carlos@globo.com",
        phone: "21987651234",
        defaultJobFunctionId: 1, // Câmera
        active: true,
      },
      {
        supplierId: supplier1Id,
        name: "Fernanda Oliveira Costa",
        cpf: "23456789012",
        email: "fernanda@globo.com",
        phone: "21987651235",
        defaultJobFunctionId: 2, // Repórter
        active: true,
      },
      {
        supplierId: supplier2Id,
        name: "Ricardo Mendes Alves",
        cpf: "34567890123",
        email: "ricardo@sportv.com",
        phone: "21987651236",
        defaultJobFunctionId: 3, // Produtor
        active: true,
      },
      {
        supplierId: supplier2Id,
        name: "Juliana Ferreira Santos",
        cpf: "45678901234",
        email: "juliana@sportv.com",
        phone: "21987651237",
        defaultJobFunctionId: 4, // Editor
        active: true,
      },
      {
        supplierId: supplier3Id,
        name: "Paulo Roberto Lima",
        cpf: "56789012345",
        email: "paulo@espn.com.br",
        phone: "11987651238",
        defaultJobFunctionId: 5, // Técnico de Som
        vehicleInfo: "Fiat Ducato - Placa ABC1234",
        active: true,
      },
    ];

    const collabIds = [];
    for (const collab of colaboradores) {
      const result = await db.insert(collaborators).values(collab);
      collabIds.push(Number(result.insertId));
    }

    // 5. Criar credenciamentos
    console.log("Criando credenciamentos...");
    await db.insert(accreditations).values({
      eventId: event1Id,
      collaboratorId: collabIds[0],
      jobFunctionId: 1,
      status: "aprovado",
      credentialNumber: "CRED2026001",
    });

    await db.insert(accreditations).values({
      eventId: event1Id,
      collaboratorId: collabIds[1],
      jobFunctionId: 2,
      status: "aprovado",
      credentialNumber: "CRED2026002",
    });

    await db.insert(accreditations).values({
      eventId: event2Id,
      collaboratorId: collabIds[2],
      jobFunctionId: 3,
      status: "pendente",
    });

    // 6. Definir limites de funções por evento
    console.log("Definindo limites de funções...");
    await db.insert(eventFunctionLimits).values({
      eventId: event1Id,
      jobFunctionId: 1,
      maxCount: 10,
    });

    await db.insert(eventFunctionLimits).values({
      eventId: event1Id,
      jobFunctionId: 2,
      maxCount: 5,
    });

    console.log("✅ Seed concluído com sucesso!");
    console.log(`
📊 Dados criados:
- 3 fornecedores
- 8 funções
- 2 eventos
- 5 colaboradores
- 3 credenciamentos
- 2 limites de função
    `);

  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seed finalizado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });
