/**
 * NYAYAMITRA - AI Legal Document Analysis Platform
 * Frontend JavaScript with PDF.js integration and Q&A features
 */

// Global variables
let currentTab = 'simplified';
let documentText = '';
let isAnalyzing = false;
let chatHistory = [];
let isAsking = false;

// PDF.js configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setupDragAndDrop();
    initializeFeatureCards();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // File input change handler
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Document text area change handler
    const documentTextArea = document.getElementById('documentText');
    if (documentTextArea) {
        documentTextArea.addEventListener('input', handleTextInput);
    }
    
    // Upload area click handler
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    // Sandbox editor change handler
    const sandboxEditor = document.getElementById('sandboxEditor');
    if (sandboxEditor) {
        sandboxEditor.addEventListener('input', handleSandboxInput);
    }

    // Nav link click handlers for smooth scrolling
    document.querySelectorAll('.nav-link').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize feature card interactions
 */
function initializeFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const feature = card.getAttribute('data-feature');
            handleFeatureClick(feature);
        });
    });
}

/**
 * Handle feature card clicks
 */
function handleFeatureClick(feature) {
    // Map features to tabs
    const featureTabMap = {
        'simplified': 'simplified',
        'red-flags': 'redflags',
        'sandbox': 'sandbox',
        'digital-twin': 'qa'
    };
    
    const targetTab = featureTabMap[feature];
    if (targetTab) {
        scrollToSection('upload');
        setTimeout(() => {
            switchTab(targetTab);
        }, 500);
    }
}

/**
 * Scroll to section
 */
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Show demo (placeholder)
 */
function showDemo() {
    showToast('info', 'Demo Coming Soon', 'Interactive demo will be available soon!');
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
}

/**
 * Prevent default drag behaviors
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Highlight upload area during drag
 */
function highlight(e) {
    document.getElementById('uploadArea').classList.add('dragover');
}

/**
 * Remove highlight from upload area
 */
function unhighlight(e) {
    document.getElementById('uploadArea').classList.remove('dragover');
}

/**
 * Handle dropped files
 */
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

/**
 * Handle file selection from input
 */
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

/**
 * Handle text input in textarea
 */
function handleTextInput(e) {
    const text = e.target.value.trim();
    if (text) {
        documentText = text;
        updateDocumentDisplay(text, 'Text Input', `${text.length} characters`);
        
        // Update sandbox editor if it's empty
        const sandboxEditor = document.getElementById('sandboxEditor');
        if (sandboxEditor && !sandboxEditor.value.trim()) {
            sandboxEditor.value = text;
        }
    }
}

/**
 * Handle sandbox editor input
 */
function handleSandboxInput(e) {
    const text = e.target.value.trim();
    if (text && text !== documentText) {
        // Generate suggestions for the modified text
        generateSandboxSuggestions(text);
    }
}

/**
 * Process uploaded file
 */
async function handleFile(file) {
    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
        showToast('error', 'Unsupported file type', 'Please upload a PDF or TXT file.');
        return;
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
        showToast('error', 'File too large', 'Please upload a file smaller than 10MB.');
        return;
    }
    
    try {
        showToast('info', 'Processing file...', 'Please wait while we extract the text.');
        
        let extractedText = '';
        const fileInfo = `${file.name} (${formatFileSize(file.size)})`;
        
        if (file.type === 'application/pdf') {
            extractedText = await extractTextFromPDF(file);
        } else if (file.type === 'text/plain') {
            extractedText = await extractTextFromTXT(file);
        }
        
        if (extractedText.trim()) {
            documentText = extractedText;
            document.getElementById('documentText').value = extractedText;
            document.getElementById('sandboxEditor').value = extractedText;
            updateDocumentDisplay(extractedText, file.name, fileInfo);
            showToast('success', 'File processed successfully', 'Document text extracted and ready for analysis.');
        } else {
            showToast('error', 'No text found', 'Could not extract text from the uploaded file.');
        }
        
    } catch (error) {
        console.error('Error processing file:', error);
        showToast('error', 'Processing failed', 'There was an error processing your file. Please try again.');
    }
}

/**
 * Extract text from PDF file using PDF.js
 */
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            try {
                const typedArray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = '';
                
                // Extract text from all pages
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                
                resolve(fullText.trim());
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = () => reject(new Error('Failed to read PDF file'));
        fileReader.readAsArrayBuffer(file);
    });
}

/**
 * Extract text from TXT file
 */
async function extractTextFromTXT(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = function() {
            resolve(this.result);
        };
        
        fileReader.onerror = () => reject(new Error('Failed to read text file'));
        fileReader.readAsText(file);
    });
}

/**
 * Update document display panel
 */
function updateDocumentDisplay(text, title, info) {
    const documentContent = document.getElementById('documentContent');
    const documentInfo = document.getElementById('documentInfo');
    
    if (documentContent) {
        documentContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; color: var(--text-secondary);">${escapeHtml(text)}</pre>`;
    }
    
    if (documentInfo) {
        documentInfo.innerHTML = `<strong>${escapeHtml(title)}</strong><br>${escapeHtml(info)}`;
    }
}

/**
 * Load sample document for testing
 */
function loadSampleDocument() {
    const sampleText = `RENTAL AGREEMENT

This rental agreement is made between Rajesh Kumar (Landlord) and Priya Sharma (Tenant) for the property located at 15, Brigade Road, Bangalore - 560001.

LEASE TERMS:
1. Monthly Rent: ₹30,000 due on the 1st of each month
2. Security Deposit: ₹90,000 (3 months' rent - non-interest bearing)
3. Lease Duration: 24 months starting from 1st January 2024
4. Late Payment: ₹500 per day after 5 days grace period
5. Early Termination: 3 months' notice required, penalty of ₹60,000 if terminated within first 12 months

TENANT RESPONSIBILITIES:
1. Maintenance of all electrical fittings and plumbing (cost up to ₹10,000 per incident)
2. No alterations to property without written consent
3. No subletting or assignment without landlord approval
4. Property to be used for residential purposes only
5. No pets allowed without prior written consent

LANDLORD RIGHTS:
1. Inspect property with 24 hours' notice
2. Increase rent by 15% annually after first year
3. Terminate lease with 30 days' notice for breach of terms
4. Retain security deposit for damages beyond normal wear and tear

ADDITIONAL CLAUSES:
1. Tenant liable for society maintenance charges (₹2,500/month)
2. Electricity and water bills to be borne by tenant
3. Any legal disputes to be resolved in Bangalore jurisdiction only
4. Lock-in period of 18 months with penalty for early exit
5. Parking space included (additional ₹3,000/month for second vehicle)

PENALTY CLAUSES:
1. ₹1,000 per day for unauthorized occupancy beyond lease term
2. ₹5,000 for each unauthorized alteration
3. Double rent for commercial use of residential property
4. Full security deposit forfeiture for property damage

This agreement is binding upon signing and all terms are non-negotiable.

Date: 15th December 2023
Landlord Signature: ________________
Tenant Signature: ________________`;

    documentText = sampleText;
    document.getElementById('documentText').value = sampleText;
    document.getElementById('sandboxEditor').value = sampleText;
    updateDocumentDisplay(sampleText, 'Sample Rental Agreement', 'Sample document for testing purposes');
    showToast('success', 'Sample loaded', 'Sample rental agreement has been loaded for analysis.');
}

/**
 * Switch between analysis tabs
 */
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    
    currentTab = tabName;
    
    // Show/hide sections based on tab
    const qaSection = document.getElementById('qaSection');
    const sandboxSection = document.getElementById('sandboxSection');
    const resultsSection = document.querySelector('.results-section');
    
    // Hide all sections first
    qaSection.classList.add('hidden');
    sandboxSection.classList.add('hidden');
    resultsSection.style.display = 'grid';
    
    // Show appropriate section
    if (tabName === 'qa') {
        qaSection.classList.remove('hidden');
        resultsSection.style.display = 'none';
        updatePanelTitle('💬 Legal Digital Twin');
    } else if (tabName === 'sandbox') {
        sandboxSection.classList.remove('hidden');
        resultsSection.style.display = 'none';
        updatePanelTitle('🛠️ Sandbox Developer');
    } else {
        updatePanelTitle(tabName === 'simplified' ? '📋 Simplified Analysis' : '🚨 Red Flag Analysis');
        
        // Clear current analysis content for traditional tabs
        const analysisContent = document.getElementById('analysisContent');
        if (analysisContent) {
            analysisContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${tabName === 'simplified' ? '📋' : '🚨'}</div>
                    <p>Click "Analyze Document" to get ${tabName === 'simplified' ? 'simplified summary' : 'red flag analysis'}</p>
                </div>
            `;
        }
    }
}

/**
 * Update panel title
 */
function updatePanelTitle(title) {
    const panelTitle = document.getElementById('analysisPanelTitle');
    if (panelTitle) {
        panelTitle.textContent = title;
    }
}

/**
 * Analyze document using selected mode
 */
async function analyzeDocument() {
    if (!documentText.trim()) {
        showToast('error', 'No document', 'Please upload a document or paste text before analyzing.');
        return;
    }
    
    if (isAnalyzing) {
        return; // Prevent multiple simultaneous requests
    }
    
    // For Q&A and Sandbox tabs, don't run traditional analysis
    if (currentTab === 'qa' || currentTab === 'sandbox') {
        showToast('info', 'Ready for interaction', `${currentTab === 'qa' ? 'Ask questions about your document' : 'Start editing your contract in the sandbox'}.`);
        return;
    }
    
    isAnalyzing = true;
    updateAnalyzeButton(true);
    
    try {
        const endpoint = currentTab === 'simplified' ? '/api/simplify' : '/api/redflags';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: documentText })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        displayAnalysisResult(result);
        showToast('success', 'Analysis complete', `${currentTab === 'simplified' ? 'Document simplified' : 'Risk analysis completed'} successfully.`);
        
    } catch (error) {
        console.error('Analysis error:', error);
        showToast('error', 'Analysis failed', error.message || 'There was an error analyzing your document. Please try again.');
        
        // Show error state in analysis panel
        const analysisContent = document.getElementById('analysisContent');
        if (analysisContent) {
            analysisContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <p style="color: var(--danger-red);">Analysis failed. Please try again or check your connection.</p>
                </div>
            `;
        }
    } finally {
        isAnalyzing = false;
        updateAnalyzeButton(false);
    }
}

/**
 * Update analyze button state
 */
function updateAnalyzeButton(analyzing) {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const spinner = document.getElementById('loadingSpinner');
    
    if (analyzing) {
        analyzeBtn.disabled = true;
        btnText.textContent = 'Analyzing...';
        spinner.classList.remove('hidden');
    } else {
        analyzeBtn.disabled = false;
        btnText.textContent = 'Analyze Document';
        spinner.classList.add('hidden');
    }
}

/**
 * Display analysis results
 */
function displayAnalysisResult(result) {
    const analysisContent = document.getElementById('analysisContent');
    if (!analysisContent) return;
    
    if (currentTab === 'simplified') {
        displaySimplifiedResult(result.simplified_text);
    } else {
        displayRedFlagsResult(result);
    }
}

/**
 * Display simplified analysis result
 */
function displaySimplifiedResult(simplifiedText) {
    const analysisContent = document.getElementById('analysisContent');
    
    // Convert markdown-like formatting to HTML
    let htmlContent = simplifiedText
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary);">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/•/g, '•')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    analysisContent.innerHTML = `
        <div style="line-height: 1.8; color: var(--text-secondary);">
            <p>${htmlContent}</p>
        </div>
    `;
}

/**
 * Display red flags analysis result
 */
function displayRedFlagsResult(redFlags) {
    const analysisContent = document.getElementById('analysisContent');
    
    if (!Array.isArray(redFlags) || redFlags.length === 0) {
        analysisContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <p>No specific risk clauses identified in this document.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="red-flags-list">';
    
    redFlags.forEach((clause, index) => {
        const riskLevel = clause.risk || 'moderate';
        const riskText = {
            safe: 'Safe',
            moderate: 'Moderate Risk',
            dangerous: 'High Risk'
        }[riskLevel] || 'Moderate Risk';
        
        html += `
            <div class="risk-clause ${riskLevel}">
                <div class="clause-header">
                    <span class="clause-number">Clause ${index + 1}</span>
                    <span class="risk-indicator ${riskLevel}">${riskText}</span>
                </div>
                <div class="clause-text">"${escapeHtml(clause.clause)}"</div>
                <div class="clause-explanation">${escapeHtml(clause.explanation)}</div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add summary statistics
    const stats = {
        safe: redFlags.filter(c => c.risk === 'safe').length,
        moderate: redFlags.filter(c => c.risk === 'moderate').length,
        dangerous: redFlags.filter(c => c.risk === 'dangerous').length
    };
    
    const summaryHtml = `
        <div style="background: var(--bg-primary); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-6); border: 1px solid var(--border-color);">
            <h4 style="margin-bottom: var(--space-3); color: var(--text-primary);">Risk Summary</h4>
            <div style="display: flex; gap: var(--space-4); flex-wrap: wrap;">
                <span style="color: var(--success-green); font-weight: 600;">✅ ${stats.safe} Safe</span>
                <span style="color: var(--warning-orange); font-weight: 600;">⚠️ ${stats.moderate} Moderate</span>
                <span style="color: var(--danger-red); font-weight: 600;">🚨 ${stats.dangerous} High Risk</span>
            </div>
        </div>
    `;
    
    analysisContent.innerHTML = summaryHtml + html;
}

/**
 * Handle question input key press
 */
function handleQuestionKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        askQuestion();
    }
}

/**
 * Ask a question about the document
 */
async function askQuestion() {
    const questionInput = document.getElementById('questionInput');
    const question = questionInput.value.trim();
    
    if (!question) {
        showToast('error', 'No question', 'Please enter a question about your document.');
        return;
    }
    
    if (!documentText.trim()) {
        showToast('error', 'No document', 'Please upload a document first before asking questions.');
        return;
    }
    
    if (isAsking) {
        return; // Prevent multiple simultaneous requests
    }
    
    // Add user message to chat
    addMessageToChat('user', question);
    questionInput.value = '';
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    isAsking = true;
    
    try {
        const response = await fetch('/api/qa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: documentText,
                question: question,
                history: chatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add AI response to chat
        addMessageToChat('assistant', result.answer);
        
        // Update chat history
        chatHistory.push({ question, answer: result.answer });
        
    } catch (error) {
        console.error('Q&A error:', error);
        removeTypingIndicator(typingId);
        addMessageToChat('assistant', 'Sorry, I encountered an error while processing your question. Please try again.');
        showToast('error', 'Question failed', error.message || 'There was an error processing your question.');
    } finally {
        isAsking = false;
    }
}

/**
 * Ask a suggested question
 */
function askSuggestedQuestion(question) {
    const questionInput = document.getElementById('questionInput');
    questionInput.value = question;
    askQuestion();
}

/**
 * Add message to chat
 */
function addMessageToChat(sender, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = sender === 'user' ? '👤' : '🤖';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <p>${escapeHtml(content)}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Add typing indicator
 */
function addTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    typingDiv.id = typingId;
    typingDiv.className = 'message assistant';
    
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingId;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(typingId) {
    const typingElement = document.getElementById(typingId);
    if (typingElement) {
        typingElement.remove();
    }
}

/**
 * Reset sandbox to original document
 */
function resetSandbox() {
    const sandboxEditor = document.getElementById('sandboxEditor');
    if (sandboxEditor && documentText) {
        sandboxEditor.value = documentText;
        showToast('success', 'Sandbox reset', 'Contract text has been reset to original.');
    }
}

/**
 * Improve sandbox content with AI
 */
async function improveSandbox() {
    const sandboxEditor = document.getElementById('sandboxEditor');
    const currentText = sandboxEditor.value.trim();
    
    if (!currentText) {
        showToast('error', 'No content', 'Please add contract text to the sandbox first.');
        return;
    }
    
    try {
        showToast('info', 'Improving contract...', 'AI is analyzing and improving your contract.');
        
        const response = await fetch('/api/improve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: currentText })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Update sandbox with improved text
        sandboxEditor.value = result.improved_text;
        
        // Generate new suggestions
        generateSandboxSuggestions(result.improved_text);
        
        showToast('success', 'Contract improved', 'AI has enhanced your contract with better terms and clarity.');
        
    } catch (error) {
        console.error('Improvement error:', error);
        showToast('error', 'Improvement failed', error.message || 'There was an error improving your contract.');
    }
}

/**
 * Generate sandbox suggestions
 */
async function generateSandboxSuggestions(text) {
    const suggestionsContent = document.getElementById('suggestionsContent');
    
    // Show loading state
    suggestionsContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">💡</div>
            <p>Generating AI suggestions...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        displaySandboxSuggestions(result.suggestions);
        
    } catch (error) {
        console.error('Suggestions error:', error);
        suggestionsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p style="color: var(--danger-red);">Failed to generate suggestions. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Display sandbox suggestions
 */
function displaySandboxSuggestions(suggestions) {
    const suggestionsContent = document.getElementById('suggestionsContent');
    
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        suggestionsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <p>No specific suggestions available for this content.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    suggestions.forEach((suggestion, index) => {
        html += `
            <div class="suggestion-item" onclick="applySuggestion(${index})">
                <div class="suggestion-title">${escapeHtml(suggestion.title)}</div>
                <div class="suggestion-description">${escapeHtml(suggestion.description)}</div>
            </div>
        `;
    });
    
    suggestionsContent.innerHTML = html;
    
    // Store suggestions globally for applying
    window.currentSuggestions = suggestions;
}

/**
 * Apply a suggestion to the sandbox
 */
function applySuggestion(index) {
    if (!window.currentSuggestions || !window.currentSuggestions[index]) {
        return;
    }
    
    const suggestion = window.currentSuggestions[index];
    const sandboxEditor = document.getElementById('sandboxEditor');
    
    if (suggestion.replacement_text) {
        sandboxEditor.value = suggestion.replacement_text;
        showToast('success', 'Suggestion applied', 'Contract has been updated with the suggested improvement.');
    }
}

/**
 * Show toast notification
 */
function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toastIcon.textContent = icons[type] || icons.info;
    toastMessage.innerHTML = `<strong>${escapeHtml(title)}</strong><br>${escapeHtml(message)}`;
    
    // Set toast class
    toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadSampleDocument,
        switchTab,
        analyzeDocument,
        askQuestion,
        showToast
    };
}