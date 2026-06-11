import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { targetUrl, method = 'POST', headers = {}, body } = await request.json();

    if (!targetUrl) {
      return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 });
    }

    console.log(`Proxying request: ${method} to ${targetUrl}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Proxy target returned error status: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Proxy target error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy server error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
