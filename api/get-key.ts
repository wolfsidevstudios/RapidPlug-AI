// This is a Vercel serverless function.
// It will be deployed to /api/get-key
// See: https://vercel.com/docs/functions/serverless-functions

export const config = {
  runtime: 'edge',
};

export default (req) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // This will be shown in Vercel's logs.
      console.error("GEMINI_API_KEY environment variable is not set.");
      return new Response(
        JSON.stringify({ error: 'API key is not configured on the server.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ apiKey }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error("Error in /api/get-key:", e);
    return new Response(
        JSON.stringify({ error: 'An internal server error occurred.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
  }
};
