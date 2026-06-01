import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateCosmosSDKTemplate, BlockchainParams } from '@/lib/generator';

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let params: BlockchainParams = {
      name: body.name || 'Custom Chain',
      symbol: body.symbol || 'CUST',
      description: body.description || '',
      consensus: body.consensus || 'Proof of Stake',
      supply: body.supply || '1000000000',
      blockTime: body.blockTime || '2',
      inflationRate: body.inflationRate || '7',
      features: body.features || ['staking'],
      minStake: body.minStake || '1000',
      maxValidators: body.maxValidators || '100',
      unbondingDays: body.unbondingDays || '21',
    };

    const { customInstructions } = body;

    if (customInstructions && openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert blockchain architect. You are given a base configuration:
${JSON.stringify(params, null, 2)}

The user has provided additional instructions. Apply those instructions to modify the configuration.
Return the FULL updated configuration as a JSON object with the exact same keys.
Respond ONLY with valid JSON.`
            },
            { role: 'user', content: customInstructions }
          ],
          response_format: { type: 'json_object' }
        });

        const resultText = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(resultText);
        params = { ...params, ...parsed };
      } catch (e) {
        console.error('LLM augmentation failed, using base params:', e);
      }
    }

    const zipBuffer = await generateCosmosSDKTemplate(params);

    const fileName = params.name.toLowerCase().replace(/\s+/g, '-');

    return new Response(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}-blockchain.zip"`
      }
    });
  } catch (error: any) {
    console.error('Error generating blockchain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate blockchain.' },
      { status: 500 }
    );
  }
}
