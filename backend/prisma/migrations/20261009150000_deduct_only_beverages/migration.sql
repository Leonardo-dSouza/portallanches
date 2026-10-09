-- A baixa automática começa só pelas bebidas (decisão do usuário, 2026-10-09). O interruptor
-- "Baixa" nasceu ligado em quase todo insumo e nunca teve efeito; agora tem: fica ligado só nas
-- seções Refrigerantes e Cervejas (onde estão também os retornáveis). O dono liga outros pela tela.
-- Conferir na produção, antes do deploy, se as bebidas estão nessas seções.
UPDATE "supplies"
SET "deduct_on_sale" = false
WHERE "deduct_on_sale" = true
  AND (
    "section_id" IS NULL
    OR "section_id" NOT IN (
      SELECT "id" FROM "supply_sections" WHERE "name_key" IN ('refrigerantes', 'cervejas')
    )
  );
