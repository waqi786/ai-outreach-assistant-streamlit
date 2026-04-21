from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import extra_streamlit_components as stx
import jwt
import streamlit as st

from streamlit_src.claude import ClaudeService
from streamlit_src.config import get_settings
from streamlit_src.database import Database
from streamlit_src.security import (
    decrypt_api_key,
    encrypt_api_key,
    hash_password,
    verify_password,
)

st.set_page_config(
    page_title="AI Outreach Assistant",
    page_icon=":speech_balloon:",
    layout="wide",
)

settings = get_settings()
db = Database(settings.database_path)
db.initialize()
claude_service = ClaudeService(model=settings.anthropic_model)


cookie_manager = stx.CookieManager()


def initialize_state() -> None:
    st.session_state.setdefault("user", None)
    st.session_state.setdefault("selected_project_id", None)
    st.session_state.setdefault("selected_chat_id", None)


def sign_session_token(user: dict[str, Any]) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def sync_user_from_cookie() -> None:
    if st.session_state.get("user"):
        return

    token = cookie_manager.get("session_token")
    if not token:
        return

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user = db.get_user_by_id(payload["sub"])
        if user:
            st.session_state["user"] = user
    except jwt.PyJWTError:
        cookie_manager.delete("session_token")


def login_user(user: dict[str, Any]) -> None:
    token = sign_session_token(user)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    cookie_manager.set("session_token", token, expires_at=expires_at)
    st.session_state["user"] = user


def logout_user() -> None:
    cookie_manager.delete("session_token")
    st.session_state["user"] = None
    st.session_state["selected_project_id"] = None
    st.session_state["selected_chat_id"] = None
    st.rerun()


def ensure_project_selection(user_id: str) -> list[dict[str, Any]]:
    projects = db.list_projects(user_id)
    if not projects:
        st.session_state["selected_project_id"] = None
        st.session_state["selected_chat_id"] = None
        return projects

    project_ids = {project["id"] for project in projects}
    if st.session_state["selected_project_id"] not in project_ids:
        st.session_state["selected_project_id"] = projects[0]["id"]

    chats = db.list_chats(st.session_state["selected_project_id"])
    chat_ids = {chat["id"] for chat in chats}
    if st.session_state["selected_chat_id"] not in chat_ids:
        st.session_state["selected_chat_id"] = chats[0]["id"] if chats else None

    return projects


def render_auth_screen() -> None:
    st.title("AI Outreach Assistant")
    st.caption("Secure, project-based Claude workspace for outreach campaigns.")

    login_tab, register_tab = st.tabs(["Login", "Register"])

    with login_tab:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Log In", use_container_width=True)

        if submitted:
            user = db.get_user_by_email(email.strip().lower())
            if not user or not verify_password(password, user["password_hash"]):
                st.error("Invalid email or password.")
            else:
                login_user(user)
                st.rerun()

    with register_tab:
        with st.form("register_form"):
            email = st.text_input("New email")
            password = st.text_input("New password", type="password")
            confirm = st.text_input("Confirm password", type="password")
            submitted = st.form_submit_button("Create Account", use_container_width=True)

        if submitted:
            normalized_email = email.strip().lower()
            if not normalized_email or "@" not in normalized_email:
                st.error("Please enter a valid email.")
            elif len(password) < 8:
                st.error("Password must be at least 8 characters.")
            elif password != confirm:
                st.error("Passwords do not match.")
            elif db.get_user_by_email(normalized_email):
                st.error("An account with this email already exists.")
            else:
                user = db.create_user(normalized_email, hash_password(password))
                login_user(user)
                st.rerun()


def render_sidebar(user: dict[str, Any], projects: list[dict[str, Any]]) -> None:
    st.sidebar.title("Workspace")
    st.sidebar.write(user["email"])

    st.sidebar.subheader("Projects")
    if projects:
        selected_project_id = st.sidebar.selectbox(
            "Select project",
            options=[project["id"] for project in projects],
            index=next(
                (
                    index
                    for index, project in enumerate(projects)
                    if project["id"] == st.session_state["selected_project_id"]
                ),
                0,
            ),
            format_func=lambda project_id: next(
                project["name"] for project in projects if project["id"] == project_id
            ),
        )
        st.session_state["selected_project_id"] = selected_project_id

    with st.sidebar.expander("Create new project", expanded=not projects):
        with st.form("create_project_form", clear_on_submit=True):
            name = st.text_input("Project name")
            system_prompt = st.text_area(
                "System prompt",
                height=180,
                placeholder=(
                    "Write short outreach messages.\n"
                    "Use simple English.\n"
                    "Start with a strong hook.\n"
                    "Include a clear CTA."
                ),
            )
            submitted = st.form_submit_button("Create project", use_container_width=True)

        if submitted:
            if not name.strip() or not system_prompt.strip():
                st.sidebar.error("Project name and system prompt are required.")
            else:
                project = db.create_project(user["id"], name.strip(), system_prompt.strip())
                st.session_state["selected_project_id"] = project["id"]
                st.session_state["selected_chat_id"] = None
                st.rerun()

    selected_project_id = st.session_state.get("selected_project_id")
    if selected_project_id:
        st.sidebar.subheader("Chats")
        if st.sidebar.button("New chat", use_container_width=True):
            chat = db.create_chat(selected_project_id, "New Chat")
            st.session_state["selected_chat_id"] = chat["id"]
            st.rerun()

        chats = db.list_chats(selected_project_id)
        for chat in chats:
            if st.sidebar.button(chat["title"], key=f"chat_{chat['id']}", use_container_width=True):
                st.session_state["selected_chat_id"] = chat["id"]
                st.rerun()

    st.sidebar.divider()
    if st.sidebar.button("Log out", use_container_width=True):
        logout_user()


def render_dashboard(user: dict[str, Any], projects: list[dict[str, Any]]) -> None:
    selected_project_id = st.session_state.get("selected_project_id")
    selected_project = (
        db.get_project(selected_project_id, user["id"]) if selected_project_id else None
    )

    header_col, stats_col = st.columns([2, 1])
    with header_col:
      st.title("AI Outreach Assistant")
      st.caption("One account, one encrypted Anthropic key, multiple AI outreach projects.")
    with stats_col:
      st.metric("Projects", len(projects))
      st.metric(
          "API key stored",
          "Yes" if user.get("encrypted_api_key") else "No",
      )

    if not projects:
        st.info("Create your first project from the sidebar to start using the assistant.")
        render_user_settings(user)
        return

    chat_tab, project_tab, settings_tab = st.tabs(["Chat", "Project Settings", "User Settings"])

    with chat_tab:
        render_chat_workspace(user, selected_project)

    with project_tab:
        if selected_project:
            render_project_settings(user, selected_project)

    with settings_tab:
        render_user_settings(user)


def render_project_settings(user: dict[str, Any], project: dict[str, Any]) -> None:
    st.subheader("Project settings")
    st.caption("Every project has its own behavior, tone, structure, and writing rules.")

    with st.form("update_project_form"):
        name = st.text_input("Project name", value=project["name"])
        system_prompt = st.text_area(
            "System prompt",
            value=project["system_prompt"],
            height=260,
        )
        submitted = st.form_submit_button("Save changes")

    if submitted:
        if not name.strip() or not system_prompt.strip():
            st.error("Project name and system prompt are required.")
        else:
            db.update_project(project["id"], user["id"], name.strip(), system_prompt.strip())
            st.success("Project updated.")
            st.rerun()

    st.divider()
    if st.button("Delete project", type="primary"):
        db.delete_project(project["id"], user["id"])
        st.session_state["selected_project_id"] = None
        st.session_state["selected_chat_id"] = None
        st.rerun()


def render_user_settings(user: dict[str, Any]) -> None:
    st.subheader("User settings")
    st.caption("Your Anthropic API key is encrypted before it is stored in SQLite.")

    placeholder = (
        "A key is already saved. Paste a new one to replace it."
        if user.get("encrypted_api_key")
        else "sk-ant-api03-..."
    )

    with st.form("api_key_form"):
        api_key = st.text_input("Anthropic API key", type="password", placeholder=placeholder)
        submitted = st.form_submit_button("Save API key")

    if submitted:
        if not api_key.strip():
            st.error("Please enter a valid API key.")
        else:
            encrypted = encrypt_api_key(api_key.strip(), settings.encryption_master_key)
            db.update_user_api_key(user["id"], encrypted)
            st.session_state["user"] = db.get_user_by_id(user["id"])
            st.success("API key saved securely.")

    if user.get("encrypted_api_key"):
        if st.button("Delete saved API key"):
            db.update_user_api_key(user["id"], None)
            st.session_state["user"] = db.get_user_by_id(user["id"])
            st.success("API key deleted.")
            st.rerun()


def render_chat_workspace(user: dict[str, Any], project: dict[str, Any] | None) -> None:
    if not project:
        st.info("Select or create a project to start chatting.")
        return

    st.subheader(project["name"])
    st.caption("Messages use the project system prompt, recent history, and latest user input.")
    st.code(project["system_prompt"], language="text")

    selected_chat_id = st.session_state.get("selected_chat_id")
    if not selected_chat_id:
        if st.button("Create first chat"):
            chat = db.create_chat(project["id"], "New Chat")
            st.session_state["selected_chat_id"] = chat["id"]
            st.rerun()
        return

    chat = db.get_chat(selected_chat_id, user["id"])
    if not chat:
        st.warning("Selected chat was not found. Creating a new one may help.")
        return

    chat_header_left, chat_header_right = st.columns([3, 1])
    with chat_header_left:
        st.markdown(f"### {chat['title']}")
    with chat_header_right:
        if st.button("Delete chat", use_container_width=True):
            db.delete_chat(chat["id"], user["id"])
            st.session_state["selected_chat_id"] = None
            st.rerun()

    messages = db.list_messages(chat["id"])
    if not messages:
        st.info("No messages yet. Start with context like lead type, audience, goal, and CTA.")

    for message in messages:
        role = "assistant" if message["role"] == "assistant" else "user"
        with st.chat_message(role):
            st.markdown(message["content"])

    user_input = st.chat_input("Describe the outreach scenario you want Claude to handle...")
    if not user_input:
        return

    if not user.get("encrypted_api_key"):
        st.error("Please save your Anthropic API key in User Settings before sending messages.")
        return

    db.create_message(chat["id"], "user", user_input.strip())
    if not messages:
        db.update_chat_title(chat["id"], user["id"], user_input[:50].strip() or "New Chat")

    encrypted_key = user["encrypted_api_key"]
    api_key = decrypt_api_key(encrypted_key, settings.encryption_master_key)
    history = db.list_recent_messages(chat["id"], limit=10)

    try:
        with st.spinner("Claude is writing your outreach message..."):
            assistant_reply = claude_service.generate_response(
                api_key=api_key,
                system_prompt=project["system_prompt"],
                history=history[:-1],
                user_input=user_input.strip(),
            )
        db.create_message(chat["id"], "assistant", assistant_reply)
        db.touch_chat(chat["id"])
    except Exception as error:
        st.error(f"Claude request failed: {error}")
    finally:
        st.rerun()


initialize_state()
sync_user_from_cookie()

current_user = st.session_state.get("user")
if not current_user:
    render_auth_screen()
else:
    projects = ensure_project_selection(current_user["id"])
    render_sidebar(current_user, projects)
    st.session_state["user"] = db.get_user_by_id(current_user["id"])
    render_dashboard(st.session_state["user"], db.list_projects(current_user["id"]))
