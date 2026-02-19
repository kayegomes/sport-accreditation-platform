# SporTV Credenciamento - TODO

## Fase 1: Modelagem do Banco de Dados e Estrutura de Perfis
- [x] Criar tabela de perfis de usuário (admin, fornecedor, consulta)
- [x] Criar tabela de eventos esportivos
- [x] Criar tabela de colaboradores (equipes)
- [x] Criar tabela de credenciamentos (vínculo colaborador-evento)
- [x] Criar tabela de logs de auditoria
- [x] Criar tabela de documentos anexados
- [x] Criar tabela de fornecedores/empresas
- [x] Criar tabela de funções de colaboradores
- [x] Criar tabela de notificações

## Fase 2: Implementação do Backend (tRPC Procedures)
- [x] Implementar procedures de autenticação e gestão de usuários
- [x] Implementar procedures de gestão de eventos (CRUD)
- [x] Implementar procedures de gestão de colaboradores (CRUD)
- [x] Implementar procedures de credenciamento (vincular colaborador a evento)
- [x] Implementar procedures de consulta pública (busca por CPF/nome)
- [x] Implementar procedures de logs de auditoria
- [x] Implementar procedures de gestão de documentos (upload/download)
- [x] Implementar middleware de controle de acesso por perfil (RBAC)

## Fase 3: Interface Administrativa e Dashboard
- [x] Criar layout dashboard com sidebar para navegação
- [x] Implementar página de dashboard com visão geral (eventos ativos, colaboradores, status)
- [x] Criar página de listagem e gestão de eventos
- [x] Criar formulário de criação/edição de eventos
- [x] Criar página de listagem e gestão de colaboradores
- [x] Criar formulário de cadastro/edição de colaboradores
- [ ] Implementar página de credenciamento (vincular colaboradores a eventos)
- [x] Criar página de consulta pública de credenciamento
- [ ] Implementar filtros avançados (evento, status, data, empresa, função)
- [ ] Criar página de visualização de logs de auditoria

## Fase 4: Exportação Excel e Importação em Lote
- [x] Implementar exportação de colaboradores em Excel
- [x] Implementar exportação de credenciais em Excel
- [ ] Implementar exportação de relatórios personalizados em Excel
- [x] Criar template de importação em lote (Excel/CSV)
- [x] Implementar validação de dados na importação
- [x] Implementar processamento de importação em lote
- [ ] Criar interface de upload e preview de importação

## Fase 5: Sistema de Logs, Notificações e Automação de Fluxo
- [x] Implementar registro automático de logs para todas operações
- [x] Criar sistema de notificações por e-mail
- [x] Implementar notificação automática D-10 (abertura de cadastro)
- [x] Implementar notificação automática D-4 (fechamento de cadastro)
- [x] Implementar notificação automática D-3 (liberação de credenciais)
- [ ] Implementar atualização automática de status de eventos baseada em datas
- [ ] Criar job/scheduler para verificação de datas críticas
- [ ] Implementar notificações de alterações importantes

## Fase 6: Testes, Validação e Checkpoint Final
- [x] Criar testes unitários para procedures críticas
- [x] Testar fluxo completo de credenciamento
- [x] Testar controle de acesso por perfil
- [x] Testar exportação e importação em lote
- [x] Testar sistema de notificações
- [x] Validar logs de auditoria
- [x] Criar dados de exemplo (mock data)
- [x] Criar checkpoint final do projeto

## Nova Funcionalidade: Página de Credenciamento Interativa

- [x] Criar página de credenciamento com seleção de evento
- [x] Implementar listagem de colaboradores disponíveis com busca/filtro
- [x] Adicionar seleção múltipla de colaboradores para credenciar
- [x] Mostrar limites de função por evento em tempo real
- [x] Implementar validação de quotas antes de credenciar
- [x] Adicionar indicadores visuais de limite atingido/disponível
- [x] Criar modal de confirmação com resumo do credenciamento
- [x] Implementar listagem de colaboradores já credenciados no evento
- [x] Adicionar funcionalidade de remover credenciamento
- [x] Criar testes para validação de limites e credenciamento


## Nova Funcionalidade: Página de Logs de Auditoria

- [x] Criar página AuditLogs.tsx com tabela de logs
- [x] Implementar filtros por usuário, ação, entidade e período
- [x] Adicionar visualização expandível de JSON (antes/depois)
- [x] Implementar badges coloridos por tipo de ação
- [x] Adicionar paginação de resultados
- [x] Formatar data/hora de forma legível
- [x] Implementar controle de acesso (apenas admin)
- [x] Criar testes para logs de auditoria


## Bug Fix: Página de Logs de Auditoria

- [x] Corrigir erro de Select.Item com value vazio no filtro de usuário


## Nova Funcionalidade: Gestão de Fornecedores e Funções

### Página de Fornecedores
- [x] Criar página Suppliers.tsx com tabela de fornecedores
- [x] Implementar modal de criação/edição de fornecedor
- [x] Adicionar campos: nome, CNPJ, contato, telefone, email
- [x] Implementar validação de CNPJ
- [x] Adicionar botão de exclusão (soft delete)
- [x] Implementar controle de acesso (apenas admin)
- [x] Adicionar busca/filtro de fornecedores

### Página de Funções
- [x] Criar página JobFunctions.tsx com tabela de funções
- [x] Implementar modal de criação/edição de função
- [x] Adicionar campos: nome, descrição, ativo
- [x] Adicionar botão de exclusão (soft delete)
- [x] Implementar controle de acesso (apenas admin)
- [x] Adicionar busca/filtro de funções

### Backend
- [x] Adicionar procedure de delete para suppliers
- [x] Adicionar procedure de delete para jobFunctions
- [x] Criar testes para CRUD de fornecedores
- [x] Criar testes para CRUD de funções


## Completar Fase 4: Exportação e Importação

### Exportação de Relatórios Personalizados
- [x] Criar página de relatórios com seleção de tipo de relatório
- [x] Implementar exportação de relatório de colaboradores por evento
- [x] Implementar exportação de relatório de credenciamentos por status
- [x] Implementar exportação de relatório de eventos por período
- [x] Adicionar filtros personalizáveis (data, evento, fornecedor, função)
- [x] Criar procedure para gerar relatórios agregados

### Interface de Upload e Preview de Importação
- [x] Criar modal de upload com drag-and-drop
- [x] Implementar preview de dados antes da importação
- [x] Adicionar validação visual de erros na tabela de preview
- [x] Mostrar resumo de registros válidos/inválidos
- [x] Permitir correção de erros antes de confirmar importação
- [x] Adicionar botão de download do template de importação
