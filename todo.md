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
