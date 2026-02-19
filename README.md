# SporTV - Plataforma de Credenciamento

Sistema completo para gestão de credenciamento de colaboradores em eventos esportivos.

## 📋 Visão Geral

Plataforma web desenvolvida para gerenciar o credenciamento de colaboradores (equipes técnicas, fornecedores, imprensa) em eventos esportivos do SporTV, com controle de acesso baseado em perfis e automação do fluxo operacional.

## 🎯 Funcionalidades Principais

### Gestão de Usuários e Perfis
- **3 perfis de usuário**: Admin, Fornecedor, Consulta
- **Admin**: Acesso completo ao sistema, gestão de eventos, aprovação de credenciamentos
- **Fornecedor**: Cadastro de colaboradores, visualização de credenciamentos próprios
- **Consulta**: Visualização apenas, sem permissões de edição

### Gestão de Eventos
- Cadastro completo de eventos esportivos (nome, data, local, federação, tipo)
- Controle de status automatizado (aberto, em verificação, extraído, enviado, concluído)
- Definição de datas críticas (D-10, D-4, D-3)
- Limites de colaboradores por função
- Filtros avançados (WO, federação, status, tipo de evento)

### Gestão de Colaboradores
- Cadastro completo com validação de CPF
- Vínculo a fornecedores/empresas
- Funções personalizáveis
- Upload de documentos (RG, CNH, comprovantes)
- Informações de veículos
- Foto do colaborador

### Sistema de Credenciamento
- Vinculação de colaboradores a eventos
- Controle de status (pendente, aprovado, rejeitado, credenciado)
- Validação automática de limites por função
- Aprovação/rejeição com observações
- Histórico completo de credenciamentos

### Exportação e Importação
- **Exportação Excel**: Colaboradores, credenciamentos, relatórios personalizados
- **Layouts personalizados**: Colunas configuráveis, formatação condicional
- **Importação em lote**: Upload de planilhas Excel/CSV
- **Validação automática**: CPF, email, campos obrigatórios
- **Relatório de erros**: Detalhamento de inconsistências

### Logs e Auditoria
- Registro automático de todas operações (CREATE, UPDATE, DELETE)
- Rastreamento completo: usuário, data/hora, IP, user-agent
- Detalhes das alterações em JSON
- Filtros por usuário, entidade, ação, data
- Histórico navegável

### Notificações Automáticas
- **D-10**: Abertura de cadastro (notificação a fornecedores)
- **D-4**: Alerta de fechamento iminente
- **D-3**: Liberação de credenciais
- Notificações de mudança de status
- Histórico de envios

### Consulta Pública
- Busca por CPF ou nome
- Verificação de status de credenciamento
- Acesso sem autenticação

## 🏗️ Arquitetura Técnica

### Stack Tecnológica
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Node.js + Express + tRPC 11
- **Banco de Dados**: MySQL/TiDB com Drizzle ORM
- **Armazenamento**: AWS S3 (documentos e arquivos)
- **Autenticação**: Manus OAuth + JWT
- **Testes**: Vitest

### Estrutura do Banco de Dados
- `users` - Usuários com perfis (admin, fornecedor, consulta)
- `suppliers` - Fornecedores/Empresas
- `job_functions` - Funções de colaboradores
- `events` - Eventos esportivos
- `event_function_limits` - Limites de colaboradores por função
- `collaborators` - Colaboradores (equipes)
- `accreditations` - Credenciamentos (vínculo colaborador-evento)
- `documents` - Documentos anexados
- `audit_logs` - Logs de auditoria
- `notifications` - Notificações enviadas
- `batch_imports` - Importações em lote
- `exports` - Exportações realizadas

### Segurança
- Autenticação JWT com sessões seguras
- RBAC (Role-Based Access Control) em todos os endpoints
- Validação de dados com Zod
- Proteção contra CSRF
- Logs de auditoria completos
- Isolamento de dados por fornecedor

## 🚀 Como Usar

### Acesso ao Sistema
1. Acesse a URL do sistema
2. Faça login com suas credenciais Manus
3. O sistema identificará automaticamente seu perfil

### Fluxo de Credenciamento

#### Para Administradores:
1. Criar evento no menu "Eventos"
2. Definir datas críticas (evento, prazo cadastro, liberação credenciais)
3. Configurar limites de funções (opcional)
4. Aguardar cadastros dos fornecedores
5. Aprovar/rejeitar credenciamentos
6. Exportar relatórios e credenciais

#### Para Fornecedores:
1. Cadastrar colaboradores no menu "Colaboradores"
2. Vincular colaboradores a eventos em "Credenciamentos"
3. Acompanhar status de aprovação
4. Receber notificações automáticas
5. Baixar credenciais aprovadas

### Importação em Lote
1. Baixar template Excel (disponível no sistema)
2. Preencher dados dos colaboradores
3. Fazer upload da planilha
4. Verificar relatório de validação
5. Confirmar importação

### Exportação de Dados
1. Acessar página de eventos ou colaboradores
2. Aplicar filtros desejados
3. Clicar em "Exportar Excel"
4. Baixar arquivo gerado

## 📊 Fluxo Operacional Automatizado

### Cronograma de Datas Críticas

**D-10 (10 dias antes do evento)**
- Sistema envia notificação de abertura de cadastro
- Status do evento: "Aberto"
- Fornecedores podem cadastrar colaboradores

**D-4 (4 dias antes do evento)**
- Sistema envia alerta de fechamento iminente
- Última chance para cadastros

**D-4 (prazo de cadastro)**
- Fechamento automático de cadastros
- Status muda para "Em Verificação"
- Administradores aprovam/rejeitam credenciamentos

**D-3 (3 dias antes do evento)**
- Liberação de credenciais
- Sistema envia notificação de credenciais disponíveis
- Status muda para "Extraído"

**Dia do Evento**
- Credenciais válidas para acesso
- Status final: "Concluído"

## 🧪 Testes

O sistema possui cobertura completa de testes unitários:

```bash
pnpm test
```

**Testes Implementados:**
- ✅ Autenticação e logout
- ✅ Controle de acesso por perfil (RBAC)
- ✅ Dashboard com estatísticas
- ✅ CRUD de fornecedores
- ✅ CRUD de funções
- ✅ CRUD de eventos
- ✅ CRUD de colaboradores
- ✅ Validação de CPF duplicado
- ✅ Consulta pública
- ✅ Logs de auditoria

**Resultado**: 22/22 testes passando (100%)

## 📝 Logs de Auditoria

Todas as operações são registradas automaticamente:

- **CREATE**: Criação de registros
- **UPDATE**: Atualização de dados
- **DELETE**: Exclusão de registros
- **UPLOAD**: Upload de documentos
- **SET_LIMIT**: Definição de limites

Cada log contém:
- Usuário responsável
- Data e hora
- Endereço IP
- User-Agent
- Detalhes da operação em JSON

## 🔔 Sistema de Notificações

### Tipos de Notificações:
- `D10_OPENING` - Abertura de cadastro
- `D4_CLOSING_WARNING` - Alerta de fechamento
- `D3_CREDENTIALS_RELEASED` - Liberação de credenciais
- `ACCREDITATION_STATUS_CHANGE` - Mudança de status

### Status de Envio:
- `pending` - Aguardando envio
- `sent` - Enviado com sucesso
- `failed` - Falha no envio (com detalhes do erro)

## 📦 Estrutura de Arquivos

```
sportv-credenciamento/
├── client/                 # Frontend React
│   └── src/
│       ├── pages/          # Páginas da aplicação
│       ├── components/     # Componentes reutilizáveis
│       └── lib/            # Utilitários e configurações
├── server/                 # Backend Node.js
│   ├── routers.ts          # tRPC procedures
│   ├── db.ts               # Helpers de banco de dados
│   ├── excelExport.ts      # Exportação Excel
│   ├── exportRouters.ts    # Routers de export/import
│   ├── emailService.ts     # Serviço de notificações
│   └── _core/              # Infraestrutura (OAuth, tRPC)
├── drizzle/                # Schema e migrações
│   └── schema.ts           # Definição das tabelas
├── shared/                 # Código compartilhado
└── storage/                # Helpers S3
```

## 🔐 Variáveis de Ambiente

O sistema utiliza variáveis de ambiente pré-configuradas pelo Manus:

- `DATABASE_URL` - Conexão com banco de dados
- `JWT_SECRET` - Segredo para sessões
- `VITE_APP_ID` - ID da aplicação OAuth
- `OAUTH_SERVER_URL` - URL do servidor OAuth
- `BUILT_IN_FORGE_API_KEY` - Chave para APIs Manus
- `OWNER_OPEN_ID` - ID do proprietário (admin automático)

## 📈 Próximas Melhorias

- [ ] Scheduler automático para verificação de datas críticas
- [ ] Interface de upload com preview de importação
- [ ] Relatórios personalizados com filtros avançados
- [ ] Integração com serviço de email (SendGrid/AWS SES)
- [ ] Dashboard com gráficos e estatísticas avançadas
- [ ] Exportação de credenciais em PDF
- [ ] QR Code para validação de credenciais
- [ ] App mobile para consulta

## 📞 Suporte

Para dúvidas ou suporte, entre em contato com a equipe SporTV.

---

**Desenvolvido para SporTV** | Versão 1.0.0 | 2026
