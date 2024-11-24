// src/components/WebsiteSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { websitesByCategory, categories } from '@/data/websites';
import { useToast } from '@/hooks/use-toast';
import type { Website, CategoryState } from '@/types';

interface WebsiteSelectorProps {
  selectedWebsites: Website[];
  onChange: (websites: Website[]) => void;
  disabled?: boolean;
}

export default function WebsiteSelector({ 
  selectedWebsites, 
  onChange,
  disabled = false
}: WebsiteSelectorProps) {
  const { toast } = useToast();
  const [categoryState, setCategoryState] = useState<CategoryState>(() => {
    const initialState: CategoryState = {};
    categories.forEach(category => {
      initialState[category] = {
        expanded: true,
        selected: false,
        websites: websitesByCategory[category]
      };
    });
    return initialState;
  });

  // 初始化时根据已选择的网站设置状态
  useEffect(() => {
    if (selectedWebsites.length > 0) {
      const newState = { ...categoryState };
      Object.entries(newState).forEach(([category, state]) => {
        const selectedInCategory = state.websites.filter(website => 
          selectedWebsites.some(selected => selected.name === website.name)
        );
        state.selected = selectedInCategory.length === state.websites.length;
      });
      setCategoryState(newState);
    }
  }, []);

  const toggleCategory = (category: string) => {
    setCategoryState(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        expanded: !prev[category].expanded
      }
    }));
  };

  const toggleCategorySelection = (category: string) => {
    const newState = { ...categoryState };
    const isSelected = !newState[category].selected;
    
    newState[category] = {
      ...newState[category],
      selected: isSelected,
    };

    // 更新选中的网站列表
    const updatedWebsites = new Set(selectedWebsites);
    newState[category].websites.forEach(website => {
      if (isSelected) {
        updatedWebsites.add(website);
      } else {
        updatedWebsites.delete(website);
      }
    });

    setCategoryState(newState);
    onChange(Array.from(updatedWebsites));

    toast({
      title: `${category}`,
      description: `已${isSelected ? '选择' : '取消选择'}全部网站`,
    });
  };

  const toggleWebsite = (category: string, website: Website) => {
    const isSelected = !selectedWebsites.some(w => w.name === website.name);
    const newSelectedWebsites = isSelected
      ? [...selectedWebsites, website]
      : selectedWebsites.filter(w => w.name !== website.name);

    const newState = { ...categoryState };
    const categoryWebsites = newState[category].websites;
    const allSelected = categoryWebsites.every(w => 
      newSelectedWebsites.some(selected => selected.name === w.name)
    );

    newState[category] = {
      ...newState[category],
      selected: allSelected,
    };

    setCategoryState(newState);
    onChange(newSelectedWebsites);
  };

  const selectAll = () => {
    const allWebsites = Object.values(websitesByCategory).flat();
    const newState = { ...categoryState };
    
    Object.keys(newState).forEach(category => {
      newState[category].selected = true;
    });

    setCategoryState(newState);
    onChange(allWebsites);

    toast({
      title: "已全选",
      description: `已选择所有网站 (${allWebsites.length})`,
    });
  };

  const deselectAll = () => {
    const newState = { ...categoryState };
    
    Object.keys(newState).forEach(category => {
      newState[category].selected = false;
    });

    setCategoryState(newState);
    onChange([]);

    toast({
      title: "已取消全选",
      description: "已取消选择所有网站",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">选择要查询的网站</CardTitle>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={deselectAll}
            disabled={selectedWebsites.length === 0 || disabled}
          >
            取消全选
          </Button>
          <Button
            onClick={selectAll}
            disabled={selectedWebsites.length === Object.values(websitesByCategory).flat().length || disabled}
          >
            全选
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category} className="border rounded-lg">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => !disabled && toggleCategory(category)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={categoryState[category].selected}
                  onChange={(e) => {
                    e.stopPropagation();
                    !disabled && toggleCategorySelection(category);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={disabled}
                />
                <span className="font-medium">{category}</span>
                <span className="text-sm text-muted-foreground">
                  ({websitesByCategory[category].length})
                </span>
              </div>
              {categoryState[category].expanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {categoryState[category].expanded && (
              <div className="border-t p-4 space-y-2">
                {websitesByCategory[category].map(website => (
                  <div key={website.name} className="flex items-center space-x-3 ml-6">
                    <input
                      type="checkbox"
                      checked={selectedWebsites.some(w => w.name === website.name)}
                      onChange={() => !disabled && toggleWebsite(category, website)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      disabled={disabled}
                    />
                    <span className="text-sm">{website.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="mt-4 text-sm text-muted-foreground">
          已选择 {selectedWebsites.length} 个网站
        </div>
      </CardContent>
    </Card>
  );
}