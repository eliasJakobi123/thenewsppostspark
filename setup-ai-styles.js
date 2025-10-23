/**
 * Setup Script für AI Writing Styles
 * Dieses Script stellt sicher, dass alle AI Style Einstellungen korrekt gespeichert und geladen werden
 */

// WritingStyleManager erweitern für bessere Speicherung
class EnhancedWritingStyleManager {
    static saveStyle(campaignId, style) {
        try {
            // Validiere die Style-Daten
            const validatedStyle = this.validateStyle(style);
            
            // Speichere in localStorage
            const key = `aiResponseStyle_campaign_${campaignId}`;
            localStorage.setItem(key, JSON.stringify(validatedStyle));
            
            // Speichere auch in der Campaign-Datenbank
            this.saveToCampaign(campaignId, validatedStyle);
            
            console.log('AI Style saved successfully:', validatedStyle);
            return true;
        } catch (error) {
            console.error('Error saving AI style:', error);
            return false;
        }
    }
    
    static getStyle(campaignId) {
        try {
            const key = `aiResponseStyle_campaign_${campaignId}`;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading AI style:', error);
            return null;
        }
    }
    
    static validateStyle(style) {
        return {
            tone: style.tone || 'friendly',
            salesStrength: parseInt(style.salesStrength) || 2,
            customOffer: style.customOffer || '',
            includeWebsite: Boolean(style.includeWebsite),
            saveStyle: Boolean(style.saveStyle),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    static saveToCampaign(campaignId, style) {
        try {
            // Finde die Campaign in der Datenbank
            if (typeof postSparkDB !== 'undefined' && postSparkDB.campaigns) {
                const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
                if (campaign) {
                    // Speichere die Style-Einstellungen in der Campaign
                    campaign.aiStyle = style;
                    
                    // Speichere in der lokalen Datenbank
                    localStorage.setItem('postSparkDB', JSON.stringify(postSparkDB));
                    
                    console.log('AI Style saved to campaign:', campaignId);
                }
            }
        } catch (error) {
            console.error('Error saving to campaign:', error);
        }
    }
    
    static loadFromCampaign(campaignId) {
        try {
            if (typeof postSparkDB !== 'undefined' && postSparkDB.campaigns) {
                const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
                if (campaign && campaign.aiStyle) {
                    return campaign.aiStyle;
                }
            }
        } catch (error) {
            console.error('Error loading from campaign:', error);
        }
        return null;
    }
    
    static getAllStyles() {
        try {
            const styles = {};
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith('aiResponseStyle_campaign_')) {
                    const campaignId = key.replace('aiResponseStyle_campaign_', '');
                    styles[campaignId] = this.getStyle(campaignId);
                }
            });
            
            return styles;
        } catch (error) {
            console.error('Error loading all styles:', error);
            return {};
        }
    }
    
    static deleteStyle(campaignId) {
        try {
            const key = `aiResponseStyle_campaign_${campaignId}`;
            localStorage.removeItem(key);
            
            // Entferne auch aus der Campaign
            if (typeof postSparkDB !== 'undefined' && postSparkDB.campaigns) {
                const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
                if (campaign) {
                    delete campaign.aiStyle;
                    localStorage.setItem('postSparkDB', JSON.stringify(postSparkDB));
                }
            }
            
            console.log('AI Style deleted for campaign:', campaignId);
            return true;
        } catch (error) {
            console.error('Error deleting AI style:', error);
            return false;
        }
    }
}

// Website URL Manager für bessere Integration
class WebsiteURLManager {
    static getCampaignWebsite(campaignId) {
        try {
            if (typeof postSparkDB !== 'undefined' && postSparkDB.campaigns) {
                const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
                return campaign ? (campaign.website_url || '') : '';
            }
        } catch (error) {
            console.error('Error getting campaign website:', error);
        }
        return '';
    }
    
    static setCampaignWebsite(campaignId, websiteUrl) {
        try {
            if (typeof postSparkDB !== 'undefined' && postSparkDB.campaigns) {
                const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
                if (campaign) {
                    campaign.website_url = websiteUrl;
                    localStorage.setItem('postSparkDB', JSON.stringify(postSparkDB));
                    console.log('Website URL saved for campaign:', campaignId, websiteUrl);
                    return true;
                }
            }
        } catch (error) {
            console.error('Error setting campaign website:', error);
        }
        return false;
    }
}

// Custom Offer Manager
class CustomOfferManager {
    static saveCustomOffer(campaignId, customOffer) {
        try {
            const key = `customOffer_campaign_${campaignId}`;
            localStorage.setItem(key, customOffer);
            
            // Speichere auch in der Campaign
            if (typeof postSparkDB !== 'undefined' && postSparkDB.campaigns) {
                const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
                if (campaign) {
                    campaign.customOffer = customOffer;
                    localStorage.setItem('postSparkDB', JSON.stringify(postSparkDB));
                }
            }
            
            console.log('Custom offer saved for campaign:', campaignId);
            return true;
        } catch (error) {
            console.error('Error saving custom offer:', error);
            return false;
        }
    }
    
    static getCustomOffer(campaignId) {
        try {
            const key = `customOffer_campaign_${campaignId}`;
            return localStorage.getItem(key) || '';
        } catch (error) {
            console.error('Error loading custom offer:', error);
            return '';
        }
    }
}

// Erweiterte AI Response Funktionen
class EnhancedAIResponseManager {
    static async generateResponse(postData, campaignId, style) {
        try {
            const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }
            
            // Validiere und bereite die Daten vor
            const requestData = {
                postContent: postData.content,
                postTitle: postData.title,
                subreddit: postData.subreddit || '',
                offer: style.customOffer || campaign.description,
                websiteUrl: style.includeWebsite ? WebsiteURLManager.getCampaignWebsite(campaignId) : '',
                tone: style.tone,
                salesStrength: style.salesStrength,
                customOffer: style.customOffer
            };
            
            console.log('Generating AI response with data:', requestData);
            
            const response = await fetch('/api/ai-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Error generating AI response:', error);
            throw error;
        }
    }
}

// Initialisierung und Setup
function initializeAIStyleSystem() {
    console.log('Initializing AI Style System...');
    
    // Ersetze den alten WritingStyleManager
    if (typeof window !== 'undefined') {
        window.WritingStyleManager = EnhancedWritingStyleManager;
        window.WebsiteURLManager = WebsiteURLManager;
        window.CustomOfferManager = CustomOfferManager;
        window.EnhancedAIResponseManager = EnhancedAIResponseManager;
    }
    
    console.log('AI Style System initialized successfully!');
}

// Auto-Initialisierung wenn das Script geladen wird
if (typeof window !== 'undefined') {
    // Warte bis die Seite geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAIStyleSystem);
    } else {
        initializeAIStyleSystem();
    }
}

// Export für Node.js falls nötig
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EnhancedWritingStyleManager,
        WebsiteURLManager,
        CustomOfferManager,
        EnhancedAIResponseManager,
        initializeAIStyleSystem
    };
}
