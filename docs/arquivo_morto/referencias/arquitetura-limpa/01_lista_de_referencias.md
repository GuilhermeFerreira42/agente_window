# Arquitetura limpa — a lista curada (projetos e ferramentas)

> **Serve para:** organizar os Bairros 1–4 e a regra das casas ("porta única").
> **Fonte:** pesquisa web de 14/10/2026. **A lista que a carta citava não existia em nenhum material** — foi **criada aqui** (na conversa de 14/10, decisão do dono).
> **Aviso:** projetos pequenos mudam de endereço; se um link morrer, procurar pelo **nome**.

## Ferramentas para a REGRA DAS FRONTEIRAS (o que mais interessa)
| Ferramenta | O que é | Uso no nosso caso |
|---|---|---|
| **dependency-cruiser** | Fiscal de imports: lê o grafo real de dependências e **falha o build** se alguém furar uma fronteira | Candidato para o ENCERRAMENTO/Robusto: tornar "Bairro 1 não importa 2–5" impossível de violar |
| **ts-arch** | Regras de arquitetura escritas como **testes** em TypeScript | Alternativa que fica dentro do vitest, se não quisermos ferramenta nova |
| **eslint-plugin-boundaries** | Regras de fronteira dentro do próprio ESLint | Se um dia migrarmos para ESLint de verdade |

*(Receita de regra pronta em `02_porta_unica_e_fiscal_de_imports.md`.)*

## Projetos de exemplo (para ler estrutura de pastas e testes)
| Projeto | O que é | O que aproveitar |
|---|---|---|
| **android10/Frontend-Architecture-Modular-Monolith** | Exemplo de monólito modular em **frontend** TS (React/Vue/Angular) — o caso mais parecido com o nosso | Estrutura de pastas por módulo e como os módulos se falam |
| **gabriel-antonelli/ts-modular-monolith-template** | Modelo de monólito modular em TypeScript | Divisão de pastas e testes por módulo |
| **mgce/modular-monolith-nodejs** | Esqueleto Node com módulos que conversam por **eventos** | Comunicação entre bairros sem acoplar (mais avançado) |
| **canerbasaran/awesome-monolith** | Lista de artigos sobre monólitos | Leitura de fundo |
| **felipfr/nestjs-nx-modular-monolith-microservices** | Monólito modular em NestJS | Ideia de "módulo exporta só a fachada" (só se um dia usarmos Nest) |

## O que NÃO trazer (para não inflar)
- DDD tático completo, CQRS, event-sourcing, micro-frontends: **peso e cerimônia demais** para um programa com um dono.
- Nossa regra — **casa com estado + porta + teste** — já resolve 90 % do problema.
