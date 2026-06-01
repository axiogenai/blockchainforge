import { NextResponse } from 'next/server';
import { generateCosmosSDKTemplate, BlockchainParams } from '@/lib/generator';
import JSZip from 'jszip';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Provide defaults for missing values
    const data: BlockchainParams = {
      name: body.name || 'Axiogen Chain',
      symbol: body.symbol || 'AXG',
      description: body.description || 'A next-generation blockchain.',
      consensus: body.consensus || 'Proof of Stake',
      supply: body.supply || '1000000000',
      blockTime: body.blockTime || '2',
      inflationRate: body.inflationRate || '7',
      features: body.features || [],
      minStake: body.minStake || '1000',
      maxValidators: body.maxValidators || '100',
      unbondingDays: body.unbondingDays || '21',
    };

    const zipBuffer = await generateCosmosSDKTemplate(data);
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const chainId = data.name.toLowerCase().replace(/\s+/g, '-');
    const binaryName = chainId.replace(/-/g, '') + 'd';
    
    const appGo = await zip.file(`${chainId}/app/app.go`)?.async('string') || 'File not found';
    const configToml = await zip.file(`${chainId}/config/config.toml`)?.async('string') || 'File not found';
    const genesisJson = await zip.file(`${chainId}/config/genesis.json`)?.async('string') || 'File not found';
    const mainGo = await zip.file(`${chainId}/cmd/${binaryName}/main.go`)?.async('string') || 'File not found';

    return NextResponse.json({
      'app.go': appGo,
      'config.toml': configToml,
      'genesis.json': genesisJson,
      'main.go': mainGo,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: error.message },
      { status: 500 }
    );
  }
}
