-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Таблица моделей велосипедов
CREATE TABLE bike_models (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'private',
    is_moderated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, model)
);

-- Таблица размеров и геометрии велосипеда
CREATE TABLE bike_sizes (
    id SERIAL PRIMARY KEY,
    bike_model_id INTEGER NOT NULL REFERENCES bike_models(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL,
    -- Геометрические параметры рамы
    "seatTube" NUMERIC(10, 2),
    "seatAngle" NUMERIC(10, 2),
    "headTube" NUMERIC(10, 2),
    "headAngle" NUMERIC(10, 2),
    "bbdrop" NUMERIC(10, 2),
    "chainstay" NUMERIC(10, 2),
    "wheelbase" NUMERIC(10, 2),
    "stack" NUMERIC(10, 2),
    "reach" NUMERIC(10, 2),
    -- Параметры колёс и трансмиссии
    "rimD" NUMERIC(10, 2),
    "tyreW" NUMERIC(10, 2),
    "crankLen" NUMERIC(10, 2),
    -- Параметры органов управления
    "stemLen" NUMERIC(10, 2),
    "stemAngle" NUMERIC(10, 2),
    "minStemHight" NUMERIC(10, 2),
    "maxStemHight" NUMERIC(10, 2),
    "barReach" NUMERIC(10, 2),
    "barDrop" NUMERIC(10, 2),
    "shifterReach" NUMERIC(10, 2),
    -- Параметры седла и подседельного штыря
    "saddleLen" NUMERIC(10, 2),
    "saddleRailLen" NUMERIC(10, 2),
    "saddleHeight" NUMERIC(10, 2),
    "minseatpostLen" NUMERIC(10, 2),
    "maxseatpostLen" NUMERIC(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bike_model_id, size)
);

-- Таблица антропометрических данных
CREATE TABLE anthropometry (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Основные параметры
    height NUMERIC(10, 2),
    "footLength" NUMERIC(10, 2),
    hip NUMERIC(10, 2),
    "lowerLeg" NUMERIC(10, 2),
    upperarm NUMERIC(10, 2),
    forearm NUMERIC(10, 2),
    -- Параметры стопы и нижних конечностей
    "hipJointOffset" NUMERIC(10, 2),
    "heelToAnkle" NUMERIC(10, 2),
    "ankleToMetatarsal" NUMERIC(10, 2),
    "heelToMetatarsal" NUMERIC(10, 2),
    toes NUMERIC(10, 2),
    "soleHight" NUMERIC(10, 2),
    -- Параметры туловища
    "torsoMax" NUMERIC(10, 2),
    "torsoMid" NUMERIC(10, 2),
    "torsoMin" NUMERIC(10, 2),
    "torsoMidAngle" NUMERIC(10, 2),
    "torsoMinAngle" NUMERIC(10, 2),
    -- Параметры головы и шеи
    "neckLen" NUMERIC(10, 2),
    "headR" NUMERIC(10, 2)
);

-- Таблица настроек посадки
CREATE TABLE fit_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bike_id INTEGER NOT NULL REFERENCES bike_sizes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    -- Параметры посадки
    "seatHight" NUMERIC(10, 2),
    "stemHight" NUMERIC(10, 2),
    "saddleOffset" NUMERIC(10, 2),
    "torsoAngle" NUMERIC(10, 2),
    "shifterAngle" NUMERIC(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, bike_id, name)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_bike_models_user_id ON bike_models(user_id);
CREATE INDEX idx_bike_models_status ON bike_models(status);
CREATE INDEX idx_bike_sizes_bike_model_id ON bike_sizes(bike_model_id);
CREATE INDEX idx_anthropometry_user_id ON anthropometry(user_id);
CREATE INDEX idx_fit_settings_user_id ON fit_settings(user_id);
CREATE INDEX idx_fit_settings_bike_id ON fit_settings(bike_id);
