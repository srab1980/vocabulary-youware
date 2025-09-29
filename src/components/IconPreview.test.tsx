import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconPreview } from "./IconPreview";

describe("IconPreview", () => {
  const mockSrc = "https://example.com/icon.png";
  const mockAlt = "Test Icon";

  it("renders the icon with correct attributes", () => {
    render(<IconPreview src={mockSrc} alt={mockAlt} />);
    
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", mockSrc);
    expect(img).toHaveAttribute("alt", mockAlt);
  });

  it("shows preview on hover", async () => {
    const user = userEvent.setup();
    render(<IconPreview src={mockSrc} alt={mockAlt} />);
    
    const img = screen.getByRole("img");
    
    // Initially, preview should not be visible
    expect(screen.queryByAltText(`${mockAlt} preview`)).not.toBeInTheDocument();
    
    // Hover over the icon
    await user.hover(img);
    
    // Preview should now be visible
    expect(screen.getByAltText(`${mockAlt} preview`)).toBeInTheDocument();
  });

  it("hides preview when mouse leaves", async () => {
    const user = userEvent.setup();
    render(<IconPreview src={mockSrc} alt={mockAlt} />);
    
    const img = screen.getByRole("img");
    
    // Hover over the icon
    await user.hover(img);
    expect(screen.getByAltText(`${mockAlt} preview`)).toBeInTheDocument();
    
    // Move mouse away
    await user.unhover(img);
    
    // Preview should be hidden
    expect(screen.queryByAltText(`${mockAlt} preview`)).not.toBeInTheDocument();
  });
});