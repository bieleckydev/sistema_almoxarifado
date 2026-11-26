# Planilhas de operacao

Planilhas de estoque, colaboradores, clientes e movimentacoes podem conter dados
pessoais ou operacionais e nao devem ser versionadas neste repositorio.

Para documentar ou testar importacoes, use apenas arquivos com dados totalmente
sinteticos e verifique-os antes de adiciona-los ao Git.

Os scripts usam a distribuicao corrigida SheetJS 0.20.3 via alias
`xlsx@npm:@e965/xlsx`; o pacote `xlsx` publicado diretamente no registro npm
continua desatualizado. Use apenas fontes autorizadas e evite processar
planilhas nao confiaveis.
