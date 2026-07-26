const SUPABASE_URL = 'https://csytpjewmhknhcxuhfes.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_4TdUVL7OG0kDlKTgjmIzcA_s1BXVSlR';

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    message.textContent = "ログイン中...";

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {
        console.error(error);
        message.textContent =
            "メールアドレスまたはパスワードが間違っています。";
        return;
    }

    console.log("ログイン成功", data);

    window.location.href = "index.html";
});
