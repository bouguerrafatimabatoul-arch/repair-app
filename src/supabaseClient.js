import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jcwblmwfjfisukumjdwn.supabase.co'   // ←URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjd2JsbXdmamZpc3VrdW1qZHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzExNzcsImV4cCI6MjA4ODI0NzE3N30.KC6IawneWdkb0PxK2NNvqWI6lJPSbjyi0rHhvJwGh8I'                         // ←anon key

export const supabase = createClient(supabaseUrl, supabaseKey)