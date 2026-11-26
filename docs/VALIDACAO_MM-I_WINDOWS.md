# Avaliação MM-I no Windows — ainda não pronta para homologação

**Não conceder aceite integral com este roteiro.** Ele é um guia provisório de avaliação, não foi executado no Windows. O runtime local de áudio/vídeo, sua instalação e os pesos ainda não são distribuídos pelo projeto; a contenção de movimentos de diretórios sob corrida externa também permanece em aberto. MM-O depende do aceite de MM-I e não deve ser iniciada agora.

## Preparação segura

1. Atualize a branch do PR #1 sem fazer merge. Em Windows, registre versão e arquitetura e execute `iniciar.cmd install`, `iniciar.cmd typecheck` e `iniciar.cmd build`. Execute `iniciar.cmd` e abra o endereço informado. Registre qualquer falha de instalação ou carregamento de dependências nativas, inclusive SQLite, PTY e `sharp`.
2. Use perfil e pasta de projeto descartáveis, fora dos seus dados pessoais. Configure pela interface um LiteLLM real sob seu controle, com ferramentas e visão. Não compartilhe chaves. Testes de capacidade e envio podem gerar custos; use exclusivamente dados sintéticos.
3. Prepare PNG/JPEG/WebP com detalhes distintos, PDF com texto selecionável `PDF sintético 742`, ZIP contendo `dados/nota.txt` com `A resposta sintética é 742`, WAV PCM mono 16 bits/16 kHz em português, com até 60 segundos e 2 MiB, e MP4 MPEG-4 curto de até 60 segundos, 12 MiB e 1024 pixels por lado. Guarde os arquivos originais para comparação. Formatos fora destes limites podem ser recusados e não devem ser tratados como suportados.

## Jornadas

4. Em Chat novo sem pasta, anexe as imagens e peça detalhes visuais. Se necessário, aceite separadamente a verificação com imagem sintética e depois o envio das imagens ao destino comprovado. Cancele uma vez para verificar que não há envio de imagem. Compare os downloads com os originais e confira a conversa após F5. Repetir com outro chat: seus arquivos não devem aparecer no Explorer da conversa anterior.
5. Envie o ZIP com **“Aguarde instruções.”** Não deve haver inspeção nem extração. Na mesma conversa, sem novo upload, peça a listagem e leitura de `dados/nota.txt`; examine e decida cada autorização. Verifique a resposta, a árvore contextual e o download. Recuse uma operação e confirme que não foi executada. Se uma execução for interrompida com resultado incerto, verifique a árvore antes de repetir.
6. Crie projeto na pasta descartável, envie arquivo em `uploads/`, edite-o no Explorer, mova e renomeie arquivo e pasta por operações da interface. Peça leitura, confira autorizações e conteúdo editado, reinicie o aplicativo e repita; o download histórico deve preservar o original. Com duas conversas no mesmo projeto, confira o compartilhamento. Teste exclusão mediada e recriação sem interpretar a substituição como o arquivo anterior.
7. Envie PDF e peça o texto. Deve haver identificação como texto extraído; PDF inválido, sem texto ou acima dos limites deve informar indisponibilidade, sem alegar OCR.
8. Áudio e vídeo são **experimentais e opcionais**. Sem os runtimes configurados, confirme que a interface informa indisponibilidade, sem inventar transcrição ou visão. Com ambiente de teste configurado de forma independente, envie o WAV ou MP4 com “Aguarde instruções.” e faça a pergunta numa mensagem posterior sem novo upload. Áudio requer autorização antes de transcrever e enviar texto, pode errar e atualmente força português. Vídeo requer visão previamente comprovada e autorização individual; apenas o primeiro quadro é enviado como PNG, não o áudio nem o vídeo completo. Cancele/recuse e confira que o conteúdo não foi enviado; em seguida autorize e confira resultado e download original.
9. Registre resultados por passo, data, versões, alias sem credenciais e erros. Não compartilhe material privado. Limpe apenas o perfil e projeto descartáveis. Resultados manuais não comprovam isolamento físico nem eliminam corridas.

## Pendências para uma decisão de aceite

- Distribuição verificável, instalação e validação Windows das dependências PyAV/FFmpeg e faster-whisper e de pesos confiáveis, com licenças, integridade e suporte. As cópias experimentais em `/tmp` no Linux não são distribuição.
- Testes em Windows e com provedor real, cobertura de falhas, cancelamento e alterações de alvo/arquivo; limites de formato, idioma e custo explicitados.
- Tratamento ou aceitação explícita da janela de corrida no rename de diretórios e das operações feitas por shell/ferramentas genéricas, que não são sandbox nem atualizam o ledger mediado.
- Consolidar evidências da regressão e substituir este guia provisório por roteiro final único. Manter o PR aberto sem merge e não iniciar MM-O antes do aceite.
