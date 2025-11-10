"""
NLP service for natural language processing and AI responses using Google Gemini
"""

import json
import re
from typing import Dict, List, Optional, Tuple
import google.generativeai as genai
from ..config import settings
from ..models import Avatar


class NLPService:
    """Service for NLP processing and AI response generation"""

    def __init__(self):
        self._initialize_gemini()

    def _initialize_gemini(self):
        """Initialize Google Gemini API"""
        if settings.google_gemini_api_key:
            genai.configure(api_key=settings.google_gemini_api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            self.is_configured = True
        else:
            self.model = None
            self.is_configured = False

    async def generate_response(
        self,
        user_message: str,
        conversation_context: List[Dict],
        avatar: Avatar
    ) -> Dict:
        """Generate AI response based on user message and conversation context"""
        if not self.is_configured:
            return self._generate_fallback_response(user_message, avatar)

        try:
            # Build context-aware prompt
            prompt = self._build_prompt(user_message, conversation_context, avatar)

            # Generate response using Gemini
            response = self.model.generate_content(prompt)
            response_text = response.text

            # Process and validate response
            processed_response = self._process_ai_response(response_text, avatar)

            return {
                "content": processed_response["content"],
                "confidence": processed_response.get("confidence", 0.8),
                "intent": processed_response.get("intent", "general"),
                "sentiment": processed_response.get("sentiment", 0.0),
                "entities": processed_response.get("entities", []),
                "suggested_actions": processed_response.get("suggested_actions", [])
            }

        except Exception as e:
            print(f"Error generating AI response: {e}")
            return self._generate_fallback_response(user_message, avatar)

    async def classify_intent(self, message: str) -> Tuple[str, float]:
        """Classify the intent of a user message"""
        if not self.is_configured:
            return self._classify_intent_fallback(message)

        try:
            prompt = f"""
            Classify the intent of this user message: "{message}"

            Possible intents:
            - greeting: Hello, hi, good morning, etc.
            - question: How, what, when, where, why queries
            - complaint: Unhappy, problem, issue, not working
            - request: Need, want, can you, help me
            - compliment: Great, awesome, thank you
            - goodbye: Bye, see you, thanks bye
            - escalation: Human, agent, representative, manager
            - general: Other messages

            Respond with JSON format: {{"intent": "intent_name", "confidence": 0.95}}
            """

            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip())

            return result.get("intent", "general"), result.get("confidence", 0.5)

        except Exception as e:
            print(f"Error classifying intent: {e}")
            return self._classify_intent_fallback(message)

    async def extract_entities(self, message: str) -> List[Dict]:
        """Extract entities from user message"""
        if not self.is_configured:
            return self._extract_entities_fallback(message)

        try:
            prompt = f"""
            Extract entities from this message: "{message}"

            Look for:
            - names: Person names, company names
            - dates: Specific dates, times, durations
            - locations: Places, addresses, cities
            - products: Product names, services
            - numbers: Quantities, prices, measurements
            - contact_info: Email addresses, phone numbers

            Respond with JSON format: {{"entities": [{{"type": "entity_type", "value": "extracted_value", "confidence": 0.9}}]}}
            """

            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip())

            return result.get("entities", [])

        except Exception as e:
            print(f"Error extracting entities: {e}")
            return self._extract_entities_fallback(message)

    async def analyze_sentiment(self, message: str) -> float:
        """Analyze sentiment of message (-1 to 1 scale)"""
        if not self.is_configured:
            return self._analyze_sentiment_fallback(message)

        try:
            prompt = f"""
            Analyze the sentiment of this message: "{message}"

            Rate sentiment on a scale from -1.0 (very negative) to 1.0 (very positive):
            - Negative emotions: angry, frustrated, disappointed, sad, worried
            - Neutral emotions: informational, factual, normal
            - Positive emotions: happy, satisfied, excited, grateful, pleased

            Respond with JSON format: {{"sentiment": 0.5, "confidence": 0.9}}
            """

            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip())

            return result.get("sentiment", 0.0)

        except Exception as e:
            print(f"Error analyzing sentiment: {e}")
            return self._analyze_sentiment_fallback(message)

    def _build_prompt(
        self,
        user_message: str,
        conversation_context: List[Dict],
        avatar: Avatar
    ) -> str:
        """Build context-aware prompt for AI response generation"""
        # Get avatar personality traits
        personality = avatar.personality_traits or {}
        traits_desc = self._format_personality_traits(personality)

        # Format conversation context
        context_str = self._format_conversation_context(conversation_context[-5:])  # Last 5 messages

        prompt = f"""
        You are {avatar.name}, an AI assistant with the following personality traits:
        {traits_desc}

        Recent conversation context:
        {context_str}

        User's latest message: "{user_message}"

        Generate a response that:
        1. Matches your personality traits
        2. Addresses the user's message directly
        3. Maintains conversation continuity
        4. Is helpful and appropriate
        5. Is concise but complete

        Also provide:
        - Intent classification
        - Sentiment analysis
        - Key entities mentioned
        - Confidence level

        Respond in JSON format:
        {{
            "content": "Your response here",
            "intent": "greeting|question|complaint|request|compliment|goodbye|escalation|general",
            "sentiment": -1.0 to 1.0,
            "entities": [{{"type": "entity_type", "value": "value"}}],
            "confidence": 0.0 to 1.0,
            "suggested_actions": ["action1", "action2"]
        }}
        """

        return prompt

    def _format_personality_traits(self, personality: Dict) -> str:
        """Format personality traits for prompt"""
        traits = []

        if "formality" in personality:
            formality = personality["formality"]
            if formality == "professional":
                traits.append("Professional and formal communication style")
            elif formality == "casual":
                traits.append("Friendly and casual communication style")
            else:
                traits.append("Balanced communication style")

        if "empathy" in personality:
            empathy = personality["empathy"]
            if empathy > 0.7:
                traits.append("Highly empathetic and understanding")
            elif empathy > 0.4:
                traits.append("Moderately empathetic")
            else:
                traits.append("Direct and to the point")

        if "directness" in personality:
            directness = personality["directness"]
            if directness > 0.7:
                traits.append("Very direct and straightforward")
            elif directness > 0.4:
                traits.append("Balanced between direct and detailed")
            else:
                traits.append("Detailed and explanatory")

        if "humor" in personality:
            humor = personality["humor"]
            if humor > 0.6:
                traits.append("Uses appropriate humor and wit")
            elif humor > 0.3:
                traits.append("Occasionally uses light humor")
            else:
                traits.append("Serious and focused")

        return "\n        ".join(traits) if traits else "Helpful and friendly AI assistant"

    def _format_conversation_context(self, messages: List[Dict]) -> str:
        """Format conversation context for prompt"""
        if not messages:
            return "No previous messages"

        context_lines = []
        for msg in messages:
            sender = "User" if msg["sender"] == "user" else "Assistant"
            content = msg["content"][:100]  # Limit length
            context_lines.append(f"{sender}: {content}")

        return "\n        ".join(context_lines)

    def _process_ai_response(self, response_text: str, avatar: Avatar) -> Dict:
        """Process and validate AI response"""
        try:
            # Try to parse as JSON
            if response_text.strip().startswith('{'):
                result = json.loads(response_text.strip())

                # Validate required fields
                if "content" not in result:
                    result["content"] = str(result)

                # Apply personality-based filtering
                content = result["content"]
                content = self._apply_personality_filter(content, avatar)
                result["content"] = content

                # Set defaults for missing fields
                result.setdefault("confidence", 0.8)
                result.setdefault("intent", "general")
                result.setdefault("sentiment", 0.0)
                result.setdefault("entities", [])
                result.setdefault("suggested_actions", [])

                return result
            else:
                # Plain text response
                return {
                    "content": self._apply_personality_filter(response_text, avatar),
                    "confidence": 0.7,
                    "intent": "general",
                    "sentiment": 0.0,
                    "entities": [],
                    "suggested_actions": []
                }

        except json.JSONDecodeError:
            # Fallback for non-JSON responses
            return {
                "content": self._apply_personality_filter(response_text, avatar),
                "confidence": 0.6,
                "intent": "general",
                "sentiment": 0.0,
                "entities": [],
                "suggested_actions": []
            }

    def _apply_personality_filter(self, content: str, avatar: Avatar) -> str:
        """Apply personality-based filtering to response content"""
        personality = avatar.personality_traits or {}

        # Apply formality adjustments
        formality = personality.get("formality", "professional")
        if formality == "professional":
            content = re.sub(r'\b(hey|hi|yo)\b', 'Hello', content, flags=re.IGNORECASE)
            content = re.sub(r'\b(thanks|thx)\b', 'Thank you', content, flags=re.IGNORECASE)
        elif formality == "casual":
            content = re.sub(r'\b(thank you)\b', 'Thanks!', content, flags=re.IGNORECASE)
            content = re.sub(r'\b(goodbye)\b', 'Bye!', content, flags=re.IGNORECASE)

        # Apply directness adjustments
        directness = personality.get("directness", 0.6)
        if directness < 0.4:
            # More detailed responses
            if len(content) < 50:
                content += " Is there anything specific you'd like to know more about?"

        # Apply empathy adjustments
        empathy = personality.get("empathy", 0.8)
        if empathy > 0.7:
            # Add empathetic phrases for negative contexts
            negative_words = ["problem", "issue", "wrong", "bad", "difficult"]
            if any(word in content.lower() for word in negative_words):
                content = "I understand this can be frustrating. " + content

        return content.strip()

    def _generate_fallback_response(self, user_message: str, avatar: Avatar) -> Dict:
        """Generate fallback response when AI service is unavailable"""
        personality = avatar.personality_traits or {}
        name = avatar.name

        # Simple rule-based responses
        message_lower = user_message.lower()

        responses = {
            "greeting": f"Hello! I'm {name}. How can I assist you today?",
            "question": "That's a great question! Let me help you with that.",
            "complaint": "I understand your concern. I'm here to help resolve this issue.",
            "request": "I'd be happy to help you with that request.",
            "compliment": "Thank you for your kind words! Is there anything else I can assist with?",
            "goodbye": f"It was great helping you! Feel free to reach out anytime. Goodbye!",
            "escalation": "I understand you'd like to speak with a human agent. Let me connect you with the right person.",
        }

        # Simple intent classification
        if any(word in message_lower for word in ["hello", "hi", "hey"]):
            content = responses["greeting"]
            intent = "greeting"
        elif any(word in message_lower for word in ["bye", "goodbye", "see you"]):
            content = responses["goodbye"]
            intent = "goodbye"
        elif any(word in message_lower for word in ["help", "assist", "support"]):
            content = responses["request"]
            intent = "request"
        elif any(word in message_lower for word in ["problem", "issue", "wrong", "broken"]):
            content = responses["complaint"]
            intent = "complaint"
        elif any(word in message_lower for word in ["human", "agent", "representative", "person"]):
            content = responses["escalation"]
            intent = "escalation"
        elif "?" in message_lower or any(word in message_lower for word in ["what", "how", "when", "where", "why"]):
            content = responses["question"]
            intent = "question"
        elif any(word in message_lower for word in ["thank", "great", "awesome", "good"]):
            content = responses["compliment"]
            intent = "compliment"
        else:
            content = f"I appreciate your message! As {name}, I'm here to help. Could you please provide more details about what you need assistance with?"
            intent = "general"

        return {
            "content": content,
            "confidence": 0.5,
            "intent": intent,
            "sentiment": 0.0,
            "entities": [],
            "suggested_actions": []
        }

    def _classify_intent_fallback(self, message: str) -> Tuple[str, float]:
        """Fallback intent classification using simple rules"""
        message_lower = message.lower()

        intent_patterns = {
            "greeting": [r"\b(hello|hi|hey|good morning|good afternoon)\b"],
            "goodbye": [r"\b(bye|goodbye|see you|farewell)\b"],
            "question": [r"\b(how|what|when|where|why|which|who)\b", r"\?"],
            "request": [r"\b(please|can you|could you|would you|need|want|help)\b"],
            "complaint": [r"\b(problem|issue|wrong|broken|not working|error)\b"],
            "compliment": [r"\b(thank|great|awesome|wonderful|excellent|good)\b"],
            "escalation": [r"\b(human|agent|representative|person|manager)\b"]
        }

        for intent, patterns in intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return intent, 0.8

        return "general", 0.5

    def _extract_entities_fallback(self, message: str) -> List[Dict]:
        """Fallback entity extraction using simple patterns"""
        entities = []

        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, message)
        for email in emails:
            entities.append({"type": "email", "value": email, "confidence": 0.9})

        # Phone numbers
        phone_pattern = r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b'
        phones = re.findall(phone_pattern, message)
        for phone in phones:
            entities.append({"type": "phone", "value": phone, "confidence": 0.9})

        # Numbers and quantities
        number_pattern = r'\b\d+(?:\.\d+)?\b'
        numbers = re.findall(number_pattern, message)
        for number in numbers:
            entities.append({"type": "number", "value": number, "confidence": 0.7})

        return entities

    def _analyze_sentiment_fallback(self, message: str) -> float:
        """Fallback sentiment analysis using simple word lists"""
        positive_words = ["good", "great", "awesome", "excellent", "happy", "love", "wonderful", "fantastic", "thank", "thanks"]
        negative_words = ["bad", "terrible", "awful", "hate", "angry", "frustrated", "disappointed", "wrong", "broken", "problem"]

        message_lower = message.lower()
        positive_count = sum(1 for word in positive_words if word in message_lower)
        negative_count = sum(1 for word in negative_words if word in message_lower)

        if positive_count > negative_count:
            return min(0.8, positive_count * 0.2)
        elif negative_count > positive_count:
            return max(-0.8, -negative_count * 0.2)
        else:
            return 0.0