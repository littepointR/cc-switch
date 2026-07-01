use crate::config::{get_home_dir, read_json_file, write_json_file};
use crate::error::AppError;
use crate::provider::Provider;
use serde_json::{json, Map, Value};
use std::path::PathBuf;

pub fn get_pi_dir() -> PathBuf {
    if let Some(override_dir) = crate::settings::get_pi_override_dir() {
        return override_dir;
    }

    if let Some(raw) = std::env::var_os("PI_CODING_AGENT_DIR") {
        let value = raw.to_string_lossy();
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }

    get_home_dir().join(".pi").join("agent")
}

pub fn get_pi_models_path() -> PathBuf {
    get_pi_dir().join("models.json")
}

pub fn get_pi_settings_path() -> PathBuf {
    get_pi_dir().join("settings.json")
}

pub fn read_pi_models_config() -> Result<Value, AppError> {
    let path = get_pi_models_path();
    if !path.exists() {
        return Ok(json!({ "providers": {} }));
    }

    let mut config: Value = read_json_file(&path)?;
    ensure_object_field(&mut config, "providers");
    Ok(config)
}

pub fn read_pi_settings_config() -> Result<Value, AppError> {
    let path = get_pi_settings_path();
    if !path.exists() {
        return Ok(json!({}));
    }

    read_json_file(&path)
}

pub fn read_pi_live_settings() -> Result<Value, AppError> {
    Ok(json!({
        "models": read_pi_models_config()?,
        "settings": read_pi_settings_config()?,
    }))
}

pub fn write_pi_provider_live(provider: &Provider) -> Result<(), AppError> {
    let provider_config = normalize_provider_config(&provider.settings_config)?;
    let default_model = default_model_from_provider(&provider_config)?;
    let default_thinking = provider
        .settings_config
        .get("defaultThinkingLevel")
        .or_else(|| provider.settings_config.get("default_thinking_level"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    let mut models_config = read_pi_models_config()?;
    ensure_object_field(&mut models_config, "providers");
    models_config["providers"][&provider.id] = provider_config;
    write_json_file(&get_pi_models_path(), &models_config)?;

    let mut settings = read_pi_settings_config()?;
    if !settings.is_object() {
        settings = json!({});
    }
    settings["defaultProvider"] = json!(provider.id);
    settings["defaultModel"] = json!(default_model);
    if let Some(level) = default_thinking {
        settings["defaultThinkingLevel"] = json!(level);
    }
    write_json_file(&get_pi_settings_path(), &settings)?;

    Ok(())
}

fn ensure_object_field(value: &mut Value, key: &str) {
    if !value.is_object() {
        *value = json!({});
    }
    let Some(obj) = value.as_object_mut() else {
        return;
    };
    if !obj.get(key).is_some_and(Value::is_object) {
        obj.insert(key.to_string(), Value::Object(Map::new()));
    }
}

fn normalize_provider_config(settings_config: &Value) -> Result<Value, AppError> {
    let obj = settings_config.as_object().ok_or_else(|| {
        AppError::Config("Pi provider settingsConfig must be a JSON object".to_string())
    })?;

    if let Some(provider_config) = obj.get("provider").or_else(|| obj.get("providerConfig")) {
        validate_pi_provider_config(provider_config)?;
        return Ok(provider_config.clone());
    }

    let mut provider = Map::new();
    for key in [
        "baseUrl",
        "api",
        "apiKey",
        "headers",
        "authHeader",
        "models",
        "modelOverrides",
        "compat",
    ] {
        if let Some(value) = obj.get(key) {
            provider.insert(key.to_string(), value.clone());
        }
    }

    let provider_value = Value::Object(provider);
    validate_pi_provider_config(&provider_value)?;
    Ok(provider_value)
}

pub fn validate_pi_provider_config(provider_config: &Value) -> Result<(), AppError> {
    let obj = provider_config
        .as_object()
        .ok_or_else(|| AppError::Config("Pi provider config must be a JSON object".to_string()))?;

    let base_url = obj
        .get("baseUrl")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if base_url.is_none() {
        return Err(AppError::Config(
            "Pi provider config requires non-empty 'baseUrl'".to_string(),
        ));
    }

    let api = obj
        .get("api")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if api.is_none() {
        return Err(AppError::Config(
            "Pi provider config requires non-empty 'api'".to_string(),
        ));
    }

    let models = obj.get("models").and_then(Value::as_array);
    if models.is_none_or(|items| items.is_empty()) {
        return Err(AppError::Config(
            "Pi provider config requires non-empty 'models' array".to_string(),
        ));
    }

    Ok(())
}

fn default_model_from_provider(provider_config: &Value) -> Result<String, AppError> {
    if let Some(default_model) = provider_config
        .get("defaultModel")
        .or_else(|| provider_config.get("default_model"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(default_model.to_string());
    }

    provider_config
        .get("models")
        .and_then(Value::as_array)
        .and_then(|models| models.first())
        .and_then(|model| model.get("id"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| AppError::Config("Pi provider config requires models[0].id".to_string()))
}
