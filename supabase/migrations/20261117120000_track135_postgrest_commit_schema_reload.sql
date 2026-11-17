-- TRACK135: refresh PostgREST's schema cache after the uniquely named Commit RPC
-- was added. No tables, rows, permissions, or RPC bodies are changed.
notify pgrst, 'reload schema';
