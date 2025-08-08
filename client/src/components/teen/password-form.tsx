import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PasswordFormData {
  title: string;
  category: string;
  website: string;
  username: string;
  email: string;
  password: string;
  notes: string;
}

interface PasswordFormProps {
  formData: PasswordFormData;
  onFormDataChange: (data: PasswordFormData) => void;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({ formData, onFormDataChange }) => {
  // Use refs to prevent cursor jumping by maintaining focus
  const titleRef = useRef<HTMLInputElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const updateField = (field: keyof PasswordFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="form-title">Title *</Label>
          <Input
            ref={titleRef}
            id="form-title"
            placeholder="Netflix, Instagram, etc."
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form-category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => updateField('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streaming">Streaming</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-website">Website</Label>
        <Input
          ref={websiteRef}
          id="form-website"
          placeholder="netflix.com"
          value={formData.website}
          onChange={(e) => updateField('website', e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="form-username">Username</Label>
          <Input
            ref={usernameRef}
            id="form-username"
            placeholder="username"
            value={formData.username}
            onChange={(e) => updateField('username', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form-email">Email</Label>
          <Input
            ref={emailRef}
            id="form-email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-password">Password *</Label>
        <Input
          ref={passwordRef}
          id="form-password"
          type="password"
          placeholder="Your password"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-notes">Notes</Label>
        <Textarea
          ref={notesRef}
          id="form-notes"
          placeholder="Security questions, special instructions, etc."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>
    </div>
  );
};