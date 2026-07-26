const SUPABASE_URL = "ここにProject URL";
const SUPABASE_KEY = "ここにPublishable key";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
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
        message.textContent = "メールアドレスまたはパスワードが間違っています。";
        return;
    }

    console.log("ログイン成功", data);

    window.location.href = "index.html";
});
