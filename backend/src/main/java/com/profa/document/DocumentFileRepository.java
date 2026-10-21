package com.profa.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DocumentFileRepository extends JpaRepository<DocumentFile, UUID> {}
