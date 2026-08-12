import React, { useEffect, useState } from "react";
import { getInfluencerSettings, updateInfluencerSettings } from "../../services/influencerCommerceService";
import { InlineToast } from "../../components/commerce/InlineToast";
import { Loader2, Save, User, MapPin, Share2, Store, Lock } from "lucide-react";

// Minimal UI Component definitions
const Button = ({ children, className = "", ...props }) => (
  <button className={`inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`} {...props}>
    {children}
  </button>
);
const Input = ({ className = "", ...props }) => (
  <input className={`flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);
const Label = ({ children, className = "", ...props }) => (
  <label className={`text-sm font-medium leading-none ${className}`} {...props}>{children}</label>
);
const Textarea = ({ className = "", ...props }) => (
  <textarea className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);

export default function InfluencerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    displayName: "",
    shortBio: "",
    longBio: "",
    primaryCategory: "",
    socialHandles: {
      instagram: "",
      youtube: "",
      website: "",
    },
    location: {
      country: "",
      state: "",
      city: "",
    },
    storeName: "",
    storeSlug: "",
    seo: {
      metaTitle: "",
      metaDescription: "",
    },
    preferences: {
      currencyPreference: "INR",
      themeMode: "system",
    },
    privacy: {
      profileVisibility: "public",
      showBio: true,
      showFollowersCount: true,
    },
    addressDetails: {
      country: "",
      state: "",
      city: "",
      address1: "",
      address2: "",
      postalCode: "",
      phone: "",
    },
    accountDetails: {
      payoutMethod: "bank_transfer",
      accountHolderName: "",
      bankName: "",
      branchName: "",
      accountNumber: "", // New account numbers
      accountNumberMask: "", // Read-only existing mask
      ifscCode: "",
      swiftCode: "",
      routingNumber: "",
      upiId: "",
      paypalEmail: "",
      additionalBankAccounts: [],
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getInfluencerSettings();
      if (res.success) {
        const p = res.data;
        setFormData({
          displayName: p.displayName || "",
          shortBio: p.shortBio || "",
          longBio: p.longBio || "",
          primaryCategory: p.primaryCategory || "",
          socialHandles: {
            instagram: p.socialHandles?.instagram || "",
            youtube: p.socialHandles?.youtube || "",
            website: p.socialHandles?.website || "",
          },
          location: {
            country: p.location?.country || "",
            state: p.location?.state || "",
            city: p.location?.city || "",
          },
          storeName: p.storeName || "",
          storeSlug: p.storeSlug || "",
          seo: {
            metaTitle: p.seo?.metaTitle || "",
            metaDescription: p.seo?.metaDescription || "",
          },
          preferences: {
            currencyPreference: p.preferences?.currencyPreference || "INR",
            themeMode: p.preferences?.themeMode || "system",
          },
          privacy: {
            profileVisibility: p.privacy?.profileVisibility || "public",
            showBio: p.privacy?.showBio ?? true,
            showFollowersCount: p.privacy?.showFollowersCount ?? true,
          },
          addressDetails: {
            country: p.businessProfile?.country || "",
            state: p.businessProfile?.state || "",
            city: p.businessProfile?.city || "",
            address1: p.businessProfile?.address1 || "",
            address2: p.businessProfile?.address2 || "",
            postalCode: p.businessProfile?.postalCode || "",
            phone: p.businessProfile?.phone || "",
          },
          accountDetails: {
            payoutMethod: p.paymentProfile?.payoutMethod || "bank_transfer",
            accountHolderName: p.paymentProfile?.accountHolderName || "",
            bankName: p.paymentProfile?.bankName || "",
            branchName: p.paymentProfile?.branchName || "",
            accountNumber: "", // Keep empty so they don't see encrypted string
            accountNumberMask: p.paymentProfile?.accountNumberMask || "",
            ifscCode: p.paymentProfile?.ifscCode || "",
            swiftCode: p.paymentProfile?.swiftCode || "",
            routingNumber: p.paymentProfile?.routingNumber || "",
            upiId: "", // Keep empty
            paypalEmail: "", // Keep empty
            additionalBankAccounts: (p.paymentProfile?.additionalBankAccounts || []).map(acc => ({
              ...acc,
              accountNumber: "", // don't expose encrypted data, only mask
            })),
          }
        });
      }
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.message || "Failed to fetch settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e, section = null) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: val
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: val
      }));
    }
  };

  const handleAdditionalAccountChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData(prev => {
      const updatedAccounts = [...prev.accountDetails.additionalBankAccounts];
      updatedAccounts[index] = {
        ...updatedAccounts[index],
        [name]: val
      };
      
      // If marking as primary, unmark others (including main?) - for now just keep simple
      return {
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          additionalBankAccounts: updatedAccounts
        }
      };
    });
  };

  const addAdditionalAccount = () => {
    setFormData(prev => ({
      ...prev,
      accountDetails: {
        ...prev.accountDetails,
        additionalBankAccounts: [
          ...prev.accountDetails.additionalBankAccounts,
          {
            payoutMethod: "bank_transfer",
            accountHolderName: "",
            bankName: "",
            branchName: "",
            accountNumber: "",
            accountNumberMask: "",
            ifscCode: "",
            swiftCode: "",
            routingNumber: "",
            upiId: "",
            paypalEmail: "",
            isPrimary: false
          }
        ]
      }
    }));
  };

  const removeAdditionalAccount = (index) => {
    setFormData(prev => {
      const updatedAccounts = [...prev.accountDetails.additionalBankAccounts];
      updatedAccounts.splice(index, 1);
      return {
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          additionalBankAccounts: updatedAccounts
        }
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        displayName: formData.displayName,
        shortBio: formData.shortBio,
        longBio: formData.longBio,
        primaryCategory: formData.primaryCategory,
        socialHandles: JSON.stringify(formData.socialHandles),
        location: JSON.stringify(formData.location),
        storeName: formData.storeName,
        storeSlug: formData.storeSlug,
        seo: JSON.stringify(formData.seo),
        preferences: JSON.stringify(formData.preferences),
        privacy: JSON.stringify(formData.privacy),
        addressDetails: JSON.stringify(formData.addressDetails),
        accountDetails: JSON.stringify(formData.accountDetails),
      };
      
      const res = await updateInfluencerSettings(payload);
      if (res.success) {
        setToast({ type: "success", message: "Settings updated successfully!" });
        fetchSettings(); // Refresh from DB
      }
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.message || "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <InlineToast toast={toast} onClose={() => setToast(null)} />
      <div className="flex items-center justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <User className="h-5 w-5 text-primary" /> Profile Information
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input name="displayName" value={formData.displayName} onChange={handleChange} placeholder="Your public name" />
            </div>
            <div className="grid gap-2">
              <Label>Primary Category</Label>
              <Input name="primaryCategory" value={formData.primaryCategory} onChange={handleChange} placeholder="e.g. Fashion, Tech, Beauty" />
            </div>
            <div className="grid gap-2">
              <Label>Short Bio</Label>
              <Input name="shortBio" value={formData.shortBio} onChange={handleChange} placeholder="One sentence describing you" maxLength={160} />
            </div>
            <div className="grid gap-2">
              <Label>Long Bio</Label>
              <Textarea name="longBio" value={formData.longBio} onChange={handleChange} placeholder="Detailed about me" rows={4} />
            </div>
          </div>
        </div>

        {/* Location & Social */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
              <MapPin className="h-5 w-5 text-primary" /> Location
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input name="country" value={formData.location.country} onChange={(e) => handleChange(e, 'location')} />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input name="state" value={formData.location.state} onChange={(e) => handleChange(e, 'location')} />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>City</Label>
                <Input name="city" value={formData.location.city} onChange={(e) => handleChange(e, 'location')} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
              <Share2 className="h-5 w-5 text-primary" /> Social Handles
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Instagram Username</Label>
                <Input name="instagram" value={formData.socialHandles.instagram} onChange={(e) => handleChange(e, 'socialHandles')} placeholder="@username" />
              </div>
              <div className="grid gap-2">
                <Label>YouTube Link</Label>
                <Input name="youtube" value={formData.socialHandles.youtube} onChange={(e) => handleChange(e, 'socialHandles')} placeholder="https://youtube.com/c/..." />
              </div>
              <div className="grid gap-2">
                <Label>Website</Label>
                <Input name="website" value={formData.socialHandles.website} onChange={(e) => handleChange(e, 'socialHandles')} placeholder="https://yourwebsite.com" />
              </div>
            </div>
          </div>
        </div>

        {/* Storefront Settings */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <Store className="h-5 w-5 text-primary" /> Storefront Preferences
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Store Name</Label>
                <Input name="storeName" value={formData.storeName} onChange={handleChange} placeholder="My Store" />
              </div>
              <div className="grid gap-2">
                <Label>Store URL Slug</Label>
                <Input name="storeSlug" value={formData.storeSlug} onChange={handleChange} placeholder="my-store-slug" />
                <span className="text-xs text-muted-foreground">This is your public URL: /influencer/{formData.storeSlug}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>SEO Title</Label>
                <Input name="metaTitle" value={formData.seo.metaTitle} onChange={(e) => handleChange(e, 'seo')} placeholder="SEO title for your store" />
              </div>
              <div className="grid gap-2">
                <Label>SEO Description</Label>
                <Textarea name="metaDescription" value={formData.seo.metaDescription} onChange={(e) => handleChange(e, 'seo')} placeholder="SEO description" rows={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <Lock className="h-5 w-5 text-primary" /> Privacy Settings
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="showBio" name="showBio" checked={formData.privacy.showBio} onChange={(e) => handleChange(e, 'privacy')} className="rounded border-gray-300 text-primary focus:ring-primary" />
              <Label htmlFor="showBio" className="font-normal cursor-pointer">Show Bio on Profile</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="showFollowersCount" name="showFollowersCount" checked={formData.privacy.showFollowersCount} onChange={(e) => handleChange(e, 'privacy')} className="rounded border-gray-300 text-primary focus:ring-primary" />
              <Label htmlFor="showFollowersCount" className="font-normal cursor-pointer">Show Followers Count</Label>
            </div>
            <div className="grid gap-2">
              <Label>Profile Visibility</Label>
              <select name="profileVisibility" value={formData.privacy.profileVisibility} onChange={(e) => handleChange(e, 'privacy')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="public">Public</option>
                <option value="followers_only">Followers Only</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Address Details */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <MapPin className="h-5 w-5 text-primary" /> Business / Mailing Address
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input name="country" value={formData.addressDetails.country} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="Country" />
              </div>
              <div className="grid gap-2">
                <Label>State / Province</Label>
                <Input name="state" value={formData.addressDetails.state} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="State" />
              </div>
              <div className="grid gap-2">
                <Label>City</Label>
                <Input name="city" value={formData.addressDetails.city} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="City" />
              </div>
              <div className="grid gap-2">
                <Label>Phone Number</Label>
                <Input name="phone" value={formData.addressDetails.phone} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="Phone Number" />
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Address Line 1</Label>
                <Input name="address1" value={formData.addressDetails.address1} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="Street address, P.O. box, etc." />
              </div>
              <div className="grid gap-2">
                <Label>Address Line 2 (Optional)</Label>
                <Input name="address2" value={formData.addressDetails.address2} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="Apartment, suite, unit, etc." />
              </div>
              <div className="grid gap-2">
                <Label>Postal Code / ZIP</Label>
                <Input name="postalCode" value={formData.addressDetails.postalCode} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="ZIP code" />
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center gap-2 font-semibold text-lg border-b pb-2">
            <Lock className="h-5 w-5 text-primary" /> Payment & Account Details
          </div>
          {/* Payment Methods Section (Array based) */}
          <div className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-base">Saved Payment Methods</h3>
                <p className="text-sm text-muted-foreground">Manage your bank accounts, UPI, and other payout methods.</p>
              </div>
              <button 
                type="button" 
                onClick={addAdditionalAccount} 
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                + Add Bank Account
              </button>
            </div>
            
            {formData.accountDetails.additionalBankAccounts.length === 0 ? (
              <div className="text-center py-6 border rounded-lg border-dashed text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50">
                No additional bank accounts saved.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.accountDetails.additionalBankAccounts.map((acc, index) => (
                  <div key={index} className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Account #{index + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => removeAdditionalAccount(index)}
                        className="text-sm font-medium text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="grid gap-4 md:col-span-2">
                        <div className="grid gap-2">
                          <Label>Payout Method</Label>
                          <select name="payoutMethod" value={acc.payoutMethod || "bank_transfer"} onChange={(e) => handleAdditionalAccountChange(index, e)} className="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600">
                            <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                            <option value="upi">UPI</option>
                            <option value="paypal">PayPal</option>
                            <option value="payoneer">Payoneer</option>
                            <option value="stripe_connect">Stripe Connect</option>
                          </select>
                        </div>
                      </div>
                      
                      {(!acc.payoutMethod || acc.payoutMethod === "bank_transfer") && (
                        <>
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label>Account Holder Name</Label>
                              <Input name="accountHolderName" value={acc.accountHolderName} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder="Name on bank account" />
                            </div>
                            <div className="grid gap-2">
                              <Label>Bank Name</Label>
                              <Input name="bankName" value={acc.bankName} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder="Bank Name" />
                            </div>
                            <div className="grid gap-2">
                              <Label>Account Number</Label>
                              <Input 
                                name="accountNumber" 
                                value={acc.accountNumber} 
                                onChange={(e) => handleAdditionalAccountChange(index, e)} 
                                placeholder={acc.accountNumberMask ? `Saved: ${acc.accountNumberMask}` : "Enter account number"} 
                              />
                            </div>
                          </div>
                          
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label>Branch Name (Optional)</Label>
                              <Input name="branchName" value={acc.branchName} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder="Branch Name" />
                            </div>
                            <div className="grid gap-2">
                              <Label>IFSC Code</Label>
                              <Input name="ifscCode" value={acc.ifscCode} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder="IFSC Code" />
                            </div>
                            <div className="grid gap-2">
                              <Label>SWIFT / Routing (Optional)</Label>
                              <Input name="swiftCode" value={acc.swiftCode} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder="SWIFT Code" />
                            </div>
                          </div>
                        </>
                      )}
                      
                      {acc.payoutMethod === "upi" && (
                        <div className="grid gap-4 md:col-span-2">
                          <div className="grid gap-2">
                            <Label>UPI ID</Label>
                            <Input name="upiId" value={acc.upiId} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder={acc.upiIdEncrypted ? "•••••••••••• (Securely Saved)" : "Enter UPI ID"} />
                            <span className="text-xs text-muted-foreground">
                              {acc.upiIdEncrypted ? "Your UPI ID is securely saved. Entering a new one will overwrite it." : "Enter your UPI ID to receive payments securely."}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {acc.payoutMethod === "paypal" && (
                        <div className="grid gap-4 md:col-span-2">
                          <div className="grid gap-2">
                            <Label>PayPal Email</Label>
                            <Input name="paypalEmail" value={acc.paypalEmail} onChange={(e) => handleAdditionalAccountChange(index, e)} placeholder={acc.paypalEmailEncrypted ? "•••••••••••• (Securely Saved)" : "Enter PayPal Email"} />
                            <span className="text-xs text-muted-foreground">
                              {acc.paypalEmailEncrypted ? "Your PayPal Email is securely saved. Entering a new one will overwrite it." : "Enter your PayPal Email to receive payments securely."}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id={`primary-${index}`} name="isPrimary" checked={acc.isPrimary} onChange={(e) => handleAdditionalAccountChange(index, e)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                          <Label htmlFor={`primary-${index}`} className="font-normal cursor-pointer">Set as Primary</Label>
                        </div>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end border-t pt-6">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}
