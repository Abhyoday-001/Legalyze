"""
Nyayamitra AI Legal Document Simplifier - Backend
Flask API server with Google Gemini integration
"""

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import google.generativeai as genai
import os
import json
import logging
from dotenv import load_dotenv


load_dotenv()


app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")
    model = None


@app.route('/')
def serve_index():
    """Serve the main HTML file"""
    return send_file('../frontend/index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files from frontend directory"""
    return send_from_directory('../frontend', filename)

@app.route('/api/simplify', methods=['POST'])
def simplify_document():
    """
    Simplify legal document text using Gemini API
    Expected input: {'text': 'document content'}
    Returns: {'simplified_text': 'AI generated summary'}
    """
    try:
        
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No document text provided'}), 400
        
        document_text = data['text'].strip()
        if not document_text:
            return jsonify({'error': 'Empty document text'}), 400
        
        
        if not model:
            
            return jsonify({
                'simplified_text': """
**SIMPLIFIED SUMMARY**

**Key Points:**
• Monthly rent: ₹25,000 due on 1st of each month
• Security deposit: ₹75,000 (refundable at lease end)
• Lease duration: 12 months starting January 1, 2024
• Late payment fee: ₹500 per day after 5-day grace period
• Early exit penalty: 2 months rent if leaving before 6 months

**Important Dates:**
• Lease starts: January 1, 2024
• No-penalty exit possible after: July 1, 2024
• Rent increase: 10% after first year

**Your Responsibilities:**
• Pay rent by 1st of each month
• Handle minor repairs under ₹5,000
• Get approval for pets or subletting
• Allow property inspections with 24-hour notice

**Financial Impact:**
• Total annual cost: ₹3,00,000 (rent) + ₹75,000 (deposit)
• Potential late fees: Up to ₹15,000 per month
• Early exit cost: ₹50,000 (if within first 6 months)
                """
            })
        
        # Create prompt for document simplification
        simplify_prompt = f"""
        You are a legal document simplifier. Take this legal document and create a clear, easy-to-understand summary.

        Document to analyze:
        {document_text}

        Please provide a simplified summary with:
        1. Key points in bullet format
        2. Important dates and deadlines
        3. Financial obligations and costs
        4. Rights and responsibilities
        5. Potential risks or penalties

        Format the response in clear sections with bullet points. Use simple language that anyone can understand.
        """
        
       
        response = model.generate_content(simplify_prompt)
        simplified_text = response.text
        
        logger.info("Document simplified successfully")
        return jsonify({'simplified_text': simplified_text})
        
    except Exception as e:
        logger.error(f"Error in simplify_document: {str(e)}")
        return jsonify({'error': 'Failed to process document. Please try again.'}), 500

@app.route('/api/redflags', methods=['POST'])
def analyze_red_flags():
    """
    Analyze legal document for red flags and risk levels
    Expected input: {'text': 'document content'}
    Returns: [{'clause': '...', 'risk': '...', 'explanation': '...'}]
    """
    try:
        
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No document text provided'}), 400
        
        document_text = data['text'].strip()
        if not document_text:
            return jsonify({'error': 'Empty document text'}), 400
        
       
        if not model:
            
            return jsonify([
                {
                    "clause": "Monthly rent: ₹25,000 due on the 1st of each month",
                    "risk": "safe",
                    "explanation": "Standard rent payment terms with clear due date. This is normal and reasonable."
                },
                {
                    "clause": "Late fee: ₹500 per day after 5 days grace period",
                    "risk": "moderate",
                    "explanation": "Daily late fees can accumulate quickly (₹15,000/month). This is higher than typical market rates."
                },
                {
                    "clause": "Security deposit: ₹75,000 (3 months rent)",
                    "risk": "moderate", 
                    "explanation": "Three months security deposit is above average. Standard is usually 1-2 months rent."
                },
                {
                    "clause": "Early termination penalty: 2 months rent if terminated before 6 months",
                    "risk": "dangerous",
                    "explanation": "₹50,000 penalty for early exit is very high. Consider negotiating a graduated penalty structure."
                },
                {
                    "clause": "Rent increase: 10% annually after first year",
                    "risk": "dangerous",
                    "explanation": "10% annual increase is above market inflation. This could significantly impact your budget over time."
                },
                {
                    "clause": "Tenant responsible for minor repairs under ₹5,000",
                    "risk": "moderate",
                    "explanation": "₹5,000 threshold is reasonable, but ensure 'minor repairs' are clearly defined to avoid disputes."
                }
            ])
        
        
        redflags_prompt = f"""
        You are a legal expert analyzing a contract for potential risks. Analyze this document and identify clauses with their risk levels.

        Document to analyze:
        {document_text}

        For each important clause, determine:
        - The specific clause text
        - Risk level: "safe", "moderate", or "dangerous"
        - Clear explanation of why it's risky and the potential impact

        Return your response as a valid JSON array with objects containing:
        {{"clause": "exact clause text", "risk": "safe/moderate/dangerous", "explanation": "detailed explanation"}}

        Focus on:
        - Payment terms and penalties
        - Termination clauses
        - Liability and responsibility assignments
        - Unusual or unfavorable terms
        - Hidden costs or fees

        Return ONLY the JSON array, no other text.
        """
        
       
        response = model.generate_content(redflags_prompt)
        response_text = response.text.strip()
        
       
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        
        try:
            red_flags = json.loads(response_text)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response: {response_text}")
            
            red_flags = [
                {
                    "clause": "Unable to parse contract clauses",
                    "risk": "moderate",
                    "explanation": "There was an issue analyzing your contract. Please try uploading again or contact support."
                }
            ]
        
        logger.info(f"Red flag analysis completed with {len(red_flags)} clauses identified")
        return jsonify(red_flags)
        
    except Exception as e:
        logger.error(f"Error in analyze_red_flags: {str(e)}")
        return jsonify({'error': 'Failed to analyze document. Please try again.'}), 500

@app.route('/api/qa', methods=['POST'])
def answer_question():
    """
    Answer questions about the legal document using Gemini API
    Expected input: {'text': 'document content', 'question': 'user question', 'history': [...]}
    Returns: {'answer': 'AI generated answer'}
    """
    try:
       
        data = request.get_json()
        if not data or 'text' not in data or 'question' not in data:
            return jsonify({'error': 'Document text and question are required'}), 400
        
        document_text = data['text'].strip()
        question = data['question'].strip()
        history = data.get('history', [])
        
        if not document_text or not question:
            return jsonify({'error': 'Both document text and question must be provided'}), 400
        
        
        if not model:
            
            mock_answers = {
                'risk': 'Based on the rental agreement, the main risks include: high daily late fees (₹500/day), significant early termination penalty (₹60,000), annual rent increases of 15%, and tenant responsibility for repairs up to ₹10,000.',
                'terminate': 'You can terminate this contract early, but there are penalties: 3 months notice is required, and if you terminate within the first 12 months, you must pay a penalty of ₹60,000. After 18 months (lock-in period), you can exit with just the 3 months notice.',
                'financial': 'Your financial obligations include: Monthly rent of ₹30,000, security deposit of ₹90,000, society maintenance charges of ₹2,500/month, electricity and water bills, potential repair costs up to ₹10,000, and possible parking fees of ₹3,000/month for a second vehicle.',
                'default': 'I can help you understand any aspect of your legal document. Please ask specific questions about clauses, terms, risks, or obligations.'
            }
            
            
            answer = mock_answers['default']
            question_lower = question.lower()
            if 'risk' in question_lower or 'danger' in question_lower:
                answer = mock_answers['risk']
            elif 'terminate' in question_lower or 'exit' in question_lower or 'leave' in question_lower:
                answer = mock_answers['terminate']
            elif 'financial' in question_lower or 'money' in question_lower or 'cost' in question_lower or 'pay' in question_lower:
                answer = mock_answers['financial']
            
            return jsonify({'answer': answer})
        
        
        context = ""
        if history:
            context = "\n\nPrevious conversation:\n"
            for item in history[-3:]:  
                context += f"Q: {item['question']}\nA: {item['answer']}\n\n"
        
        
        qa_prompt = f"""
        You are a helpful legal assistant. Answer the user's question about their legal document clearly and accurately.
        
        Document content:
        {document_text}
        
        {context}
        
        User's question: {question}
        
        Please provide a clear, helpful answer that:
        1. Directly addresses the user's question
        2. References specific parts of the document when relevant
        3. Explains legal terms in simple language
        4. Highlights any important implications or risks
        5. Suggests next steps if appropriate
        
        Keep your answer concise but comprehensive. Use bullet points when listing multiple items.
        """
        
        
        response = model.generate_content(qa_prompt)
        answer = response.text
        
        logger.info("Q&A response generated successfully")
        return jsonify({'answer': answer})
        
    except Exception as e:
        logger.error(f"Error in answer_question: {str(e)}")
        return jsonify({'error': 'Failed to process question. Please try again.'}), 500

@app.route('/api/improve', methods=['POST'])
def improve_contract():
    """
    Improve contract text using AI suggestions
    Expected input: {'text': 'contract content'}
    Returns: {'improved_text': 'AI improved contract'}
    """
    try:
        
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No contract text provided'}), 400
        
        contract_text = data['text'].strip()
        if not contract_text:
            return jsonify({'error': 'Empty contract text'}), 400
        
        
        if not model:
            
            improved_text = contract_text.replace(
                '₹500 per day after 5 days grace period',
                '₹200 per day after 7 days grace period'
            ).replace(
                '15% annually after first year',
                '8% annually after first year, capped at market rates'
            ).replace(
                'penalty of ₹60,000 if terminated within first 12 months',
                'graduated penalty: ₹30,000 if terminated within 6 months, ₹15,000 if terminated within 12 months'
            )
            
            return jsonify({'improved_text': improved_text})
        
        
        improve_prompt = f"""
        You are a legal expert helping to improve a contract. Review this contract and make it more fair and balanced for both parties.
        
        Original contract:
        {contract_text}
        
        Please provide an improved version that:
        1. Reduces unfair penalties and fees
        2. Adds more reasonable terms
        3. Clarifies ambiguous language
        4. Balances rights and responsibilities
        5. Includes standard protective clauses
        
        Return the complete improved contract text, maintaining the same structure but with better terms.
        """
        
        
        response = model.generate_content(improve_prompt)
        improved_text = response.text
        
        logger.info("Contract improvement completed successfully")
        return jsonify({'improved_text': improved_text})
        
    except Exception as e:
        logger.error(f"Error in improve_contract: {str(e)}")
        return jsonify({'error': 'Failed to improve contract. Please try again.'}), 500

@app.route('/api/suggestions', methods=['POST'])
def get_suggestions():
    """
    Get improvement suggestions for contract text
    Expected input: {'text': 'contract content'}
    Returns: {'suggestions': [{'title': '...', 'description': '...', 'replacement_text': '...'}]}
    """
    try:
        # Get contract text from request
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No contract text provided'}), 400
        
        contract_text = data['text'].strip()
        if not contract_text:
            return jsonify({'error': 'Empty contract text'}), 400
        
       
        if not model:
            
            mock_suggestions = [
                {
                    "title": "Reduce Late Payment Penalty",
                    "description": "The current ₹500/day late fee is excessive. Industry standard is ₹100-200/day.",
                    "replacement_text": None
                },
                {
                    "title": "Add Grace Period for Rent Increase",
                    "description": "15% annual increase is high. Suggest capping at 8% or market rate, whichever is lower.",
                    "replacement_text": None
                },
                {
                    "title": "Clarify Repair Responsibilities",
                    "description": "Define 'minor repairs' more clearly to avoid disputes about the ₹10,000 threshold.",
                    "replacement_text": None
                },
                {
                    "title": "Add Tenant Protection Clause",
                    "description": "Include protection against arbitrary eviction and ensure proper notice periods.",
                    "replacement_text": None
                }
            ]
            
            return jsonify({'suggestions': mock_suggestions})
        
       
        suggestions_prompt = f"""
        You are a legal expert analyzing a contract. Provide specific improvement suggestions.
        
        Contract text:
        {contract_text}
        
        Analyze the contract and provide 3-5 specific suggestions for improvement. For each suggestion, provide:
        - A clear title describing the improvement
        - A detailed description explaining why this change is beneficial
        - The impact on fairness and risk
        
        Focus on:
        1. Reducing unfair penalties
        2. Balancing power between parties
        3. Clarifying ambiguous terms
        4. Adding protective clauses
        5. Improving financial terms
        
        Return your response as a valid JSON array with objects containing:
        {{"title": "suggestion title", "description": "detailed explanation"}}
        
        Return ONLY the JSON array, no other text.
        """
        
       
        response = model.generate_content(suggestions_prompt)
        response_text = response.text.strip()
        
       
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        
        try:
            suggestions = json.loads(response_text)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response: {response_text}")
           
            suggestions = [
                {
                    "title": "Review Contract Terms",
                    "description": "There was an issue analyzing your contract. Please try again or contact support."
                }
            ]
        
        logger.info(f"Generated {len(suggestions)} suggestions successfully")
        return jsonify({'suggestions': suggestions})
        
    except Exception as e:
        logger.error(f"Error in get_suggestions: {str(e)}")
        return jsonify({'error': 'Failed to generate suggestions. Please try again.'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'gemini_configured': model is not None,
        'version': '1.0.0'
    })

if __name__ == '__main__':
   
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write('# Add your Google Gemini API key here\n')
            f.write('GEMINI_API_KEY=your_gemini_api_key_here\n')
        logger.info("Created .env file. Please add your GEMINI_API_KEY.")
    
    
    app.run(host='0.0.0.0', port=5000, debug=True)