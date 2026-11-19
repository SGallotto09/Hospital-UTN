CREATE TABLE IF NOT EXISTS alergia_rectificaciones (
    id_alergia_anterior INT NOT NULL,
    id_alergia_nueva INT NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    PRIMARY KEY (id_alergia_anterior),
    UNIQUE KEY uq_rectificacion_alergia_nueva (id_alergia_nueva),
    CONSTRAINT fk_rectificacion_alergia_anterior
        FOREIGN KEY (id_alergia_anterior) REFERENCES alergias (id) ON DELETE RESTRICT,
    CONSTRAINT fk_rectificacion_alergia_nueva
        FOREIGN KEY (id_alergia_nueva) REFERENCES alergias (id) ON DELETE RESTRICT,
    CONSTRAINT chk_rectificacion_motivo CHECK (CHAR_LENGTH(TRIM(motivo)) > 0),
    CONSTRAINT chk_rectificacion_version CHECK (id_alergia_anterior <> id_alergia_nueva)
) ENGINE=InnoDB;
