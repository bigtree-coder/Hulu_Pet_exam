import type { AiFeedback } from './types'

const SYSTEM = `You give writing feedback to a 9-year-old Chinese child who is learning English at about A2–B1 level (Cambridge B1 Preliminary for Schools).
Be warm and specific. Name exactly two things the child did well and exactly one thing to improve next time — never more than one.
Write the English in short, simple sentences a child at this level can read. For each point also give a short explanation in Simplified Chinese.
Do not give a score or grade, do not count mistakes, and do not rewrite the whole text.`

const SCHEMA = {
  type: 'object',
  properties: {
    good: {
      type: 'array',
      items: {
        type: 'object',
        properties: { en: { type: 'string' }, zh: { type: 'string' } },
        required: ['en', 'zh'],
        additionalProperties: false,
      },
    },
    tip: {
      type: 'object',
      properties: { en: { type: 'string' }, zh: { type: 'string' } },
      required: ['en', 'zh'],
      additionalProperties: false,
    },
  },
  required: ['good', 'tip'],
  additionalProperties: false,
} as const

/**
 * 作文反馈：2 条优点 + 1 条建议。这是整个应用里唯一的对外请求，
 * 只在家长面板打开 AI 开关并填了密钥后才会被调用；SDK 也按需加载。
 */
export async function getWritingFeedback(apiKey: string, prompt: string, text: string): Promise<AiFeedback> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  let response
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Writing task:\n${prompt}\n\nThe child's writing:\n${text}` }],
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('API 密钥无效，请在家长面板检查')
    if (e instanceof Anthropic.RateLimitError) throw new Error('请求太频繁，过一会儿再试')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('连不上网络，稍后再试')
    if (e instanceof Anthropic.APIError) throw new Error(`AI 接口出错（${e.status ?? '未知'}）`)
    throw e
  }
  if (response.stop_reason === 'refusal') throw new Error('AI 这次没有给出反馈')
  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('AI 没有返回内容')
  const data = JSON.parse(block.text) as AiFeedback
  return { good: data.good.slice(0, 2), tip: data.tip }
}
