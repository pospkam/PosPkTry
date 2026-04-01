-- 086: Adversarial Lead Scoring
-- Добавляет колонки для Bull / Bear / Arbiter анализа в lead_proposals

ALTER TABLE lead_proposals
  ADD COLUMN IF NOT EXISTS bull_signals      JSONB         DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS bear_risks        JSONB         DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS conversion_prob   SMALLINT      DEFAULT NULL CHECK (conversion_prob BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS recommended_action VARCHAR(25)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS call_strategy     TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verdict_urgency   VARCHAR(10)   DEFAULT NULL;

COMMENT ON COLUMN lead_proposals.bull_signals       IS 'Сигналы Bull-агента: причины покупки';
COMMENT ON COLUMN lead_proposals.bear_risks         IS 'Риски Bear-агента: причины отказа';
COMMENT ON COLUMN lead_proposals.conversion_prob    IS 'Вероятность конверсии 0-100 (Arbiter)';
COMMENT ON COLUMN lead_proposals.recommended_action IS 'call_immediately | send_proposal | nurture | skip';
COMMENT ON COLUMN lead_proposals.call_strategy      IS 'Скрипт звонка от Arbiter-агента';
COMMENT ON COLUMN lead_proposals.verdict_urgency    IS 'hot | warm | cold';
